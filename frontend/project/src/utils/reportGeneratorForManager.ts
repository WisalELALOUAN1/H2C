import jsPDF from 'jspdf';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ManagerDashboardData, LightProject } from '../types';

const CHART_COLORS = [
  '#1e40af', '#059669', '#dc2626', '#d97706', '#0891b2',
  '#16a34a', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5',
  '#9333ea', '#db2777', '#65a30d', '#ca8a04', '#0284c7'
];

interface ReportData {
  dashboardData: ManagerDashboardData;
  projects: LightProject[];
  params: {
    dateDebut: string;
    dateFin: string;
    projetId: string;
    format: string;
  };
}

// Configuration des graphiques haute résolution
const CHART_CONFIG = {
  barChart: {
    width: 1200,
    height: 700,
    margin: { top: 90, right: 60, bottom: 90, left: 90 },
    fontSizes: {
      title: 24,
      axisTitle: 18,
      axisLabels: 16,
      values: 18
    }
  },
  pieChart: {
    width: 900,
    height: 600,
    fontSizes: {
      title: 24,
      legendTitle: 16,
      legendValue: 14,
      sliceLabel: 16
    }
  }
};

// Fonction pour générer un graphique en barres haute résolution
const generateBarChartSVG = (
  labels: string[],
  values: number[],
  colors: string[],
  options: {
    title?: string;
    yAxisTitle?: string;
    xAxisTitle?: string;
  }
): string => {
  const { width, height, margin } = CHART_CONFIG.barChart;
  const { title, yAxisTitle, xAxisTitle } = options;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxValue = Math.max(...values, 0);
  const yScale = maxValue > 0 ? innerHeight / maxValue : 1;

  const bars = values
    .map((value, i) => {
      const barHeight = value * yScale;
      const x = margin.left + (i * innerWidth) / values.length;
      const y = margin.top + innerHeight - barHeight;
      const barWidth = innerWidth / values.length - 15;

      return `
        <!-- Ombre de la barre -->
        <rect 
          x="${x + 8}" 
          y="${y + 5}" 
          width="${barWidth}" 
          height="${barHeight}" 
          fill="rgba(0,0,0,0.2)" 
          rx="4" 
          ry="4"
        />
        <!-- Barre principale -->
        <rect 
          x="${x + 5}" 
          y="${y}" 
          width="${barWidth}" 
          height="${barHeight}" 
          fill="${colors[i % colors.length]}" 
          rx="4" 
          ry="4"
          stroke="#ffffff"
          stroke-width="3"
        />
        <!-- Valeur affichée -->
        <text 
          x="${x + barWidth / 2 + 5}" 
          y="${y - 12}" 
          text-anchor="middle" 
          font-size="${CHART_CONFIG.barChart.fontSizes.values}" 
          font-weight="bold"
          fill="#1f2937"
        >
          ${value.toFixed(1)}h
        </text>
      `;
    })
    .join('');

  // Génération des labels d'axe X
  const xLabels = labels
    .map((label, i) => {
      const x = margin.left + (i * innerWidth) / values.length + innerWidth / (2 * values.length);
      const y = margin.top + innerHeight + 30;

      return `
        <text 
          x="${x}" 
          y="${y}" 
          text-anchor="middle" 
          font-size="${CHART_CONFIG.barChart.fontSizes.axisLabels}" 
          font-weight="600"
          fill="#374151"
        >
          ${label}
        </text>
      `;
    })
    .join('');

  // Génération de l'axe Y avec grille
  const yTicks = [];
  const tickCount = 6;
  for (let i = 0; i <= tickCount; i++) {
    const value = (maxValue * i) / tickCount;
    const y = margin.top + innerHeight - (value * yScale);

    yTicks.push(`
      <!-- Ligne de grille -->
      <line 
        x1="${margin.left}" 
        y1="${y}" 
        x2="${margin.left + innerWidth}" 
        y2="${y}" 
        stroke="#e5e7eb" 
        stroke-width="1"
      />
      <!-- Marqueur d'axe -->
      <line 
        x1="${margin.left - 10}" 
        y1="${y}" 
        x2="${margin.left}" 
        y2="${y}" 
        stroke="#6b7280" 
        stroke-width="2"
      />
      <!-- Étiquette de valeur -->
      <text 
        x="${margin.left - 20}" 
        y="${y + 6}" 
        text-anchor="end" 
        font-size="${CHART_CONFIG.barChart.fontSizes.axisLabels}" 
        font-weight="500"
        fill="#6b7280"
      >
        ${value.toFixed(1)}
      </text>
    `);
  }

  return `
    <svg 
      width="${width}" 
      height="${height}" 
      viewBox="0 0 ${width} ${height}" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Fond blanc -->
      <rect width="100%" height="100%" fill="#ffffff" rx="8" ry="8" />
      
      <!-- Titre -->
      ${title ? `
        <text 
          x="${width / 2}" 
          y="${margin.top / 2}" 
          text-anchor="middle" 
          font-size="${CHART_CONFIG.barChart.fontSizes.title}" 
          font-weight="bold" 
          fill="#1f2937"
        >
          ${title}
        </text>
      ` : ''}
      
      <!-- Axe Y -->
      <line 
        x1="${margin.left}" 
        y1="${margin.top}" 
        x2="${margin.left}" 
        y2="${margin.top + innerHeight}" 
        stroke="#6b7280" 
        stroke-width="2"
      />
      ${yTicks.join('')}
      
      ${yAxisTitle ? `
        <text 
          x="${margin.left - 60}" 
          y="${margin.top + innerHeight / 2}" 
          text-anchor="middle" 
          transform="rotate(-90, ${margin.left - 60}, ${margin.top + innerHeight / 2})" 
          font-size="${CHART_CONFIG.barChart.fontSizes.axisTitle}" 
          font-weight="bold" 
          fill="#374151"
        >
          ${yAxisTitle}
        </text>
      ` : ''}
      
      <!-- Axe X -->
      <line 
        x1="${margin.left}" 
        y1="${margin.top + innerHeight}" 
        x2="${margin.left + innerWidth}" 
        y2="${margin.top + innerHeight}" 
        stroke="#6b7280" 
        stroke-width="2"
      />
      ${xLabels}
      
      ${xAxisTitle ? `
        <text 
          x="${margin.left + innerWidth / 2}" 
          y="${height - 25}" 
          text-anchor="middle" 
          font-size="${CHART_CONFIG.barChart.fontSizes.axisTitle}" 
          font-weight="bold" 
          fill="#374151"
        >
          ${xAxisTitle}
        </text>
      ` : ''}
      
      <!-- Barres -->
      ${bars}
      
      <!-- Bordure du graphique -->
      <rect 
        x="${margin.left}" 
        y="${margin.top}" 
        width="${innerWidth}" 
        height="${innerHeight}" 
        fill="none" 
        stroke="#d1d5db" 
        stroke-width="1" 
        rx="4" 
        ry="4"
      />
    </svg>
  `;
};

// Fonction pour générer un graphique circulaire haute résolution
const generatePieChartSVG = (
  data: { label: string; value: number }[],
  colors: string[],
  options: {
    title?: string;
  }
): string => {
  const { width, height } = CHART_CONFIG.pieChart;
  const { title } = options;

  // Validation des données
  const validData = data.filter(item => !isNaN(item.value) && item.value > 0);

  if (validData.length === 0) {
    return `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff" rx="8" ry="8" />
        <text 
          x="50%" 
          y="50%" 
          text-anchor="middle" 
          fill="#6b7280" 
          font-size="20" 
          font-weight="600"
        >
          Aucune donnée disponible
        </text>
      </svg>
    `;
  }

  const radius = Math.min(width, height) / 2 - 80;
  const center = { x: width / 2, y: height / 2 };
  const total = validData.reduce((sum, item) => sum + item.value, 0);

  let cumulativeAngle = 0;
  const slices = validData
    .map((item, i) => {
      const angle = (item.value / total) * 360;
      const startAngle = cumulativeAngle;
      cumulativeAngle += angle;

      const startRad = (startAngle - 90) * (Math.PI / 180);
      const endRad = (startAngle + angle - 90) * (Math.PI / 180);

      const x1 = center.x + radius * Math.cos(startRad);
      const y1 = center.y + radius * Math.sin(startRad);
      const x2 = center.x + radius * Math.cos(endRad);
      const y2 = center.y + radius * Math.sin(endRad);

      const largeArcFlag = angle > 180 ? 1 : 0;

      // Position du label au centre de la tranche
      const midAngle = (startAngle + angle / 2 - 90) * (Math.PI / 180);
      const labelRadius = radius * 0.6;
      const labelX = center.x + labelRadius * Math.cos(midAngle);
      const labelY = center.y + labelRadius * Math.sin(midAngle);

      return `
        <!-- Ombre de la tranche -->
        <path 
          d="M ${center.x} ${center.y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
          fill="rgba(0,0,0,0.1)"
          transform="translate(5,5)"
        />
        <!-- Tranche principale -->
        <path 
          d="M ${center.x} ${center.y} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z" 
          fill="${colors[i % colors.length]}"
          stroke="#ffffff"
          stroke-width="4"
        />
        <!-- Pourcentage dans la tranche -->
        ${angle > 15 ? `
          <text 
            x="${labelX}" 
            y="${labelY}" 
            text-anchor="middle" 
            font-size="${CHART_CONFIG.pieChart.fontSizes.sliceLabel}" 
            font-weight="bold"
            fill="#ffffff"
            filter="url(#textOutline)"
          >
            ${((item.value / total) * 100).toFixed(0)}%
          </text>
        ` : ''}
      `;
    })
    .join('');

  // Génération de la légende
  const legendStartX = center.x + radius + 40;
  const legendStartY = center.y - (validData.length * 35) / 2;

  const legends = validData
    .map((item, i) => {
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
      const y = legendStartY + i * 35;
      
      return `
        <!-- Carré de couleur -->
        <rect 
          x="${legendStartX}" 
          y="${y - 10}" 
          width="20" 
          height="20" 
          fill="${colors[i % colors.length]}"
          rx="3"
          stroke="#ffffff"
          stroke-width="2"
        />
        <!-- Nom de la catégorie -->
        <text 
          x="${legendStartX + 30}" 
          y="${y + 5}" 
          font-size="${CHART_CONFIG.pieChart.fontSizes.legendTitle}" 
          font-weight="600"
          fill="#374151"
        >
          ${item.label}
        </text>
        <!-- Détails -->
        <text 
          x="${legendStartX + 30}" 
          y="${y + 20}" 
          font-size="${CHART_CONFIG.pieChart.fontSizes.legendValue}" 
          fill="#6b7280"
        >
          ${item.value.toFixed(1)}h (${percentage}%)
        </text>
      `;
    })
    .join('');

  return `
    <svg 
      width="${width}" 
      height="${height}" 
      viewBox="0 0 ${width} ${height}" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- Filtre pour contour de texte -->
      <defs>
        <filter id="textOutline" x="-0.5" y="-0.5" width="2" height="2">
          <feMorphology operator="dilate" radius="1" in="SourceAlpha" result="thicker" />
          <feFlood flood-color="rgba(0,0,0,0.5)" result="flood" />
          <feComposite in="flood" in2="thicker" operator="in" result="outline" />
          <feComposite in="outline" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>
      
      <!-- Fond avec bordure arrondie -->
      <rect width="100%" height="100%" fill="#ffffff" rx="8" ry="8" />
      
      <!-- Titre -->
      ${title ? `
        <text 
          x="${width / 2}" 
          y="40" 
          text-anchor="middle" 
          font-size="${CHART_CONFIG.pieChart.fontSizes.title}" 
          font-weight="bold" 
          fill="#1f2937"
        >
          ${title}
        </text>
      ` : ''}
      
      <!-- Graphique -->
      ${slices}
      
      <!-- Légende -->
      ${legends}
      
      <!-- Bordure du graphique -->
      <circle 
        cx="${center.x}" 
        cy="${center.y}" 
        r="${radius + 5}" 
        fill="none" 
        stroke="#e5e7eb" 
        stroke-width="1"
      />
    </svg>
  `;
};

const addSVGToPDF = async (pdf: jsPDF, svg: string, x: number, y: number, width: number, height: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Créer canvas haute résolution (x8)
      const scaleFactor = 8;
      const canvas = document.createElement('canvas');
      canvas.width = width * scaleFactor;
      canvas.height = height * scaleFactor;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Impossible d\'obtenir le contexte canvas');

      // Optimisation de la qualité
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Fond blanc
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Créer image SVG
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        try {
          // Dessiner l'image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Convertir en PNG avec qualité maximale
          const pngData = canvas.toDataURL('image/png', 1.0);
          
          // Ajouter au PDF sans compression
          pdf.addImage({
            imageData: pngData,
            x: x,
            y: y,
            width: width,
            height: height,
            compression: 'NONE',
            alias: 'chart_' + Date.now()
          });
          
          // Nettoyage
          URL.revokeObjectURL(url);
          resolve();
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(new Error('Erreur de rendu SVG: ' + (error instanceof Error ? error.message : String(error))));
        }
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Erreur de chargement de l\'image SVG'));
      };
      
      img.src = url;
    } catch (error) {
      reject(new Error('Erreur de préparation SVG: ' + (error instanceof Error ? error.message : String(error))));
    }
  });
};

// Génération du rapport détaillé par employé
export const generateDetailedEmployeeReport = async (reportData: ReportData): Promise<void> => {
  try {
    const { dashboardData, projects, params } = reportData;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      filters: ['ASCIIHexEncode']
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // En-tête principal avec dégradé
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 45, 'F');
    
    // Ligne décorative
    pdf.setFillColor(217, 119, 6);
    pdf.rect(0, 40, pageWidth, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT DÉTAILLÉ PAR EMPLOYÉ', pageWidth / 2, 25, { align: 'center' });
    
    // Période de la semaine courante
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const selectedProject = params.projetId ? projects.find(p => p.id.toString() === params.projetId)?.nom : 'Tous les projets';
    pdf.text(
      `Semaine du ${format(weekStart, 'dd/MM/yyyy', { locale: fr })} au ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })} | Projet: ${selectedProject}`,
      pageWidth / 2, 35, { align: 'center' }
    );
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 55;
    
    // Métriques globales avec design amélioré
    const totalHours = Object.values(dashboardData.charge_par_employe || {}).reduce((sum, hours) => sum + hours, 0);
    const employeeCount = Object.keys(dashboardData.charge_par_employe || {}).length;
    const avgHoursPerEmployee = employeeCount > 0 ? totalHours / employeeCount : 0;
    const productiveHours = Object.values(dashboardData.charge_par_categorie || {})
      .filter(cat => cat.label === 'Projets')
      .reduce((sum, cat) => sum + cat.heures, 0);
    const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    
    const metrics = [
      { label: 'Total employés', value: `${employeeCount}`, color: [30, 64, 175] },
      { label: 'Total heures', value: `${totalHours.toFixed(1)}h`, color: [5, 150, 105] },
      { label: 'Moyenne/employé', value: `${avgHoursPerEmployee.toFixed(1)}h`, color: [217, 119, 6] },
      { label: 'Productivité', value: `${productivityRate.toFixed(1)}%`, color: [8, 145, 178] }
    ];
    
    const boxWidth = 47;
    const boxHeight = 32;
    const spacing = 6;
    const totalWidth = (boxWidth + spacing) * metrics.length - spacing;
    const startX = (pageWidth - totalWidth) / 2;
    
    metrics.forEach((metric, index) => {
      const x = startX + index * (boxWidth + spacing);
      
      // Ombre
      pdf.setFillColor(0, 0, 0, 20);
      pdf.roundedRect(x + 2, yPosition + 2, boxWidth, boxHeight, 4, 4, 'F');
      
      // Boîte principale
      pdf.setFillColor(...metric.color);
      pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 4, 4, 'F');
      
      // Valeur
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + boxWidth/2, yPosition + 16, { align: 'center' });
      
      // Label
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric.label, x + boxWidth/2, yPosition + 24, { align: 'center' });
    });
    
    yPosition += 45;
    
    // Graphique de répartition par employé avec titre enrichi
    if (Object.keys(dashboardData.charge_par_employe || {}).length > 0) {
      // Section titre
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(10, yPosition - 5, pageWidth - 20, 20, 3, 3, 'F');
      
      pdf.setTextColor(30, 64, 175);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📊 RÉPARTITION DES HEURES PAR EMPLOYÉ', 15, yPosition + 8);
      
      yPosition += 25;
      
      const employeeLabels = Object.keys(dashboardData.charge_par_employe || {});
      const employeeValues = Object.values(dashboardData.charge_par_employe || {});
      
      const employeeChartSVG = generateBarChartSVG(employeeLabels, employeeValues, CHART_COLORS, {
        title: 'Performance individuelle des employés',
        yAxisTitle: 'Heures travaillées',
        xAxisTitle: 'Employés'
      });
      
      await addSVGToPDF(pdf, employeeChartSVG, 10, yPosition, 190, 130);
      yPosition += 140;
    }
    
    // Nouvelle page pour l'analyse par catégorie
    pdf.addPage();
    yPosition = 20;
    
    // En-tête analyse avec design amélioré
    pdf.setFillColor(5, 150, 105);
    pdf.rect(0, 0, pageWidth, 45, 'F');
    
    pdf.setFillColor(217, 119, 6);
    pdf.rect(0, 40, pageWidth, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANALYSE PAR CATÉGORIE D\'ACTIVITÉ', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Répartition du temps par type d\'activité', pageWidth / 2, 35, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 55;
    
    // Graphique par catégorie avec analyse
    if (Object.keys(dashboardData.charge_par_categorie || {}).length > 0) {
      const categoryData = Object.entries(dashboardData.charge_par_categorie || {})
        .map(([key, cat]) => ({
          label: cat.label,
          value: cat.heures
        }));
      
      const categoryPieSVG = generatePieChartSVG(categoryData, CHART_COLORS, {
        title: 'Distribution des activités'
      });
      
      await addSVGToPDF(pdf, categoryPieSVG, 10, yPosition, 190, 120);
      yPosition += 130;
      
      // Analyse des catégories
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(10, yPosition, pageWidth - 20, 50, 5, 5, 'F');
      
      pdf.setFillColor(5, 150, 105);
      pdf.roundedRect(15, yPosition + 5, pageWidth - 30, 15, 3, 3, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('💡 ANALYSE DES CATÉGORIES', 20, yPosition + 15);
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const categoryAnalysis = [
        `Productivité: ${productivityRate.toFixed(1)}% du temps consacré aux projets`,
        `Répartition équilibrée: ${categoryData.length} catégories d'activités identifiées`,
        `Temps non-productif: ${(totalHours - productiveHours).toFixed(1)}h sur ${totalHours.toFixed(1)}h totales`
      ];
      
      categoryAnalysis.forEach((analysis, index) => {
        pdf.text(`• ${analysis}`, 20, yPosition + 30 + (index * 8));
      });
      
      yPosition += 60;
    }
    
    // Détail des employés avec tableau enrichi
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFillColor(30, 64, 175);
    pdf.roundedRect(10, yPosition - 5, pageWidth - 20, 25, 5, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text('👥 ANALYSE DÉTAILLÉE PAR EMPLOYÉ', 15, yPosition + 12);
    
    yPosition += 35;
    pdf.setTextColor(0, 0, 0);
    
    // Statistiques de performance
    const maxHours = Math.max(...Object.values(dashboardData.charge_par_employe || {}));
    const minHours = Math.min(...Object.values(dashboardData.charge_par_employe || {}));
    
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(10, yPosition, pageWidth - 20, 25, 3, 3, 'F');
    
    pdf.setTextColor(107, 114, 128);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Statistiques: Moyenne ${avgHoursPerEmployee.toFixed(1)}h | Maximum ${maxHours.toFixed(1)}h | Minimum ${minHours.toFixed(1)}h`, 15, yPosition + 8);
    
    yPosition += 30;
    
    // Tableau des employés avec design amélioré
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(10, yPosition - 3, pageWidth - 20, 18, 3, 3, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const headers = ['Employé', 'Heures', 'Performance', 'Écart/Moyenne'];
    const colX = [15, 80, 130, 170];
    
    headers.forEach((header, index) => {
      pdf.text(header, colX[index], yPosition + 10);
    });
    
    yPosition += 18;
    
    // Données des employés avec indicateurs visuels
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    Object.entries(dashboardData.charge_par_employe || {}).forEach(([employee, hours], index) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 30;
      }
      
      // Alternance de couleurs
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(10, yPosition - 2, pageWidth - 20, 14, 2, 2, 'F');
      }
      
      const performance = hours >= avgHoursPerEmployee ? 'Au-dessus' : 'En-dessous';
      const ecart = (hours - avgHoursPerEmployee).toFixed(1);
      const performanceColor = hours >= avgHoursPerEmployee ? [22, 163, 74] : [234, 179, 8];
      
      // Barre de performance
      const perfBarWidth = (hours / maxHours) * 60;
      pdf.setFillColor(...performanceColor, 50);
      pdf.roundedRect(75, yPosition + 2, perfBarWidth, 6, 1, 1, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.text(employee, colX[0], yPosition + 8);
      pdf.text(`${hours.toFixed(1)}h`, colX[1], yPosition + 8);
      
      pdf.setTextColor(...performanceColor);
      pdf.text(performance, colX[2], yPosition + 8);
      pdf.text(`${ecart > 0 ? '+' : ''}${ecart}h`, colX[3], yPosition + 8);
      
      yPosition += 14;
    });
    
    // Pied de page enrichi
    const now2 = new Date();
    pdf.setFillColor(243, 244, 246);
    pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    pdf.setTextColor(75, 85, 99);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Rapport généré le ${format(now2, 'dd/MM/yyyy à HH:mm', { locale: fr })} | Données de la semaine courante`,
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );
    
    // Sauvegarde du PDF
    const fileName = `Rapport_Detaille_Employes_Semaine_${format(weekStart, 'yyyy-MM-dd', { locale: fr })}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport détaillé:', error);
    throw new Error('Impossible de générer le rapport détaillé');
  }
};

// Génération du rapport de synthèse global
export const generateGlobalSummaryReport = async (reportData: ReportData): Promise<void> => {
  try {
    const { dashboardData, projects, params } = reportData;
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      filters: ['ASCIIHexEncode']
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // En-tête principal avec design premium
    pdf.setFillColor(220, 38, 127);
    pdf.rect(0, 0, pageWidth, 45, 'F');
    
    pdf.setFillColor(217, 119, 6);
    pdf.rect(0, 40, pageWidth, 5, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(28);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT DE SYNTHÈSE GLOBAL', pageWidth / 2, 25, { align: 'center' });
    
    // Période de la semaine courante
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const selectedProject = params.projetId ? projects.find(p => p.id.toString() === params.projetId)?.nom : 'Tous les projets';
    pdf.text(
      `Semaine du ${format(weekStart, 'dd/MM/yyyy', { locale: fr })} au ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })} | Projet: ${selectedProject}`,
      pageWidth / 2, 35, { align: 'center' }
    );
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 55;
    
    // Calculs des métriques globales
    const totalHours = Object.values(dashboardData.charge_par_employe || {}).reduce((sum, hours) => sum + hours, 0);
    const totalProjects = Object.keys(dashboardData.charge_par_projet || {}).length;
    const totalEmployees = Object.keys(dashboardData.charge_par_employe || {}).length;
    const productiveHours = Object.values(dashboardData.charge_par_categorie || {})
      .filter(cat => cat.label === 'Projets')
      .reduce((sum, cat) => sum + cat.heures, 0);
    const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    
    // Métriques de synthèse avec design premium
    const summaryMetrics = [
      { label: 'Total heures', value: `${totalHours.toFixed(1)}h`, color: [30, 64, 175] },
      { label: 'Projets actifs', value: `${totalProjects}`, color: [5, 150, 105] },
      { label: 'Employés', value: `${totalEmployees}`, color: [217, 119, 6] },
      { label: 'Productivité', value: `${productivityRate.toFixed(1)}%`, color: [8, 145, 178] },
      { label: 'H. productives', value: `${productiveHours.toFixed(1)}h`, color: [22, 163, 74] }
    ];
    
    const boxWidth = 37;
    const boxHeight = 32;
    const spacing = 6;
    const totalWidth = (boxWidth + spacing) * summaryMetrics.length - spacing;
    const startX = (pageWidth - totalWidth) / 2;
    
    summaryMetrics.forEach((metric, index) => {
      const x = startX + index * (boxWidth + spacing);
      
      // Ombre
      pdf.setFillColor(0, 0, 0, 20);
      pdf.roundedRect(x + 2, yPosition + 2, boxWidth, boxHeight, 4, 4, 'F');
      
      // Boîte principale
      pdf.setFillColor(...metric.color);
      pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 4, 4, 'F');
      
      // Valeur
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + boxWidth/2, yPosition + 16, { align: 'center' });
      
      // Label
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric.label, x + boxWidth/2, yPosition + 24, { align: 'center' });
    });
    
    yPosition += 45;
    
    // Graphique de répartition par projet avec titre enrichi
    if (Object.keys(dashboardData.charge_par_projet || {}).length > 0) {
      // Section titre
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(10, yPosition - 5, pageWidth - 20, 20, 3, 3, 'F');
      
      pdf.setTextColor(220, 38, 127);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('📈 RÉPARTITION GLOBALE PAR PROJET', 15, yPosition + 8);
      
      yPosition += 25;
      
      const projectData = Object.entries(dashboardData.charge_par_projet || {})
        .map(([project, data]) => ({
          label: project,
          value: data.heures
        }));
      
      const projectPieSVG = generatePieChartSVG(projectData, CHART_COLORS, {
        title: 'Distribution des heures par projet'
      });
      
      await addSVGToPDF(pdf, projectPieSVG, 10, yPosition, 190, 120);
      yPosition += 130;
    }
    
    // Nouvelle page pour l'analyse de performance
    pdf.addPage();
    yPosition = 20;
    
    // Indicateurs de performance avec design enrichi
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(10, yPosition - 5, pageWidth - 20, 25, 5, 5, 'F');
    
    pdf.setFillColor(220, 38, 127);
    pdf.roundedRect(15, yPosition, pageWidth - 30, 15, 3, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('🎯 INDICATEURS DE PERFORMANCE GLOBALE', 20, yPosition + 10);
    
    yPosition += 35;
    
    const avgHoursPerEmployee = totalEmployees > 0 ? totalHours / totalEmployees : 0;
    const efficiency = totalEmployees > 0 ? (dashboardData.semaines_a_valider?.length || 0) / totalEmployees : 0;
    const teamProductivity = avgHoursPerEmployee >= 35 ? 'Excellente' : avgHoursPerEmployee >= 28 ? 'Bonne' : 'À améliorer';
    const teamProductivityColor = avgHoursPerEmployee >= 35 ? [22, 163, 74] : avgHoursPerEmployee >= 28 ? [217, 119, 6] : [220, 38, 38];
    
    const performanceMetrics = [
      { 
        label: 'Performance équipe', 
        value: teamProductivity, 
        sublabel: `${avgHoursPerEmployee.toFixed(1)}h/employé`, 
        color: teamProductivityColor 
      },
      { 
        label: 'Efficacité', 
        value: `${efficiency.toFixed(1)}`, 
        sublabel: 'semaines/employé', 
        color: [8, 145, 178] 
      },
      { 
        label: 'Diversification', 
        value: `${totalProjects}`, 
        sublabel: 'projets simultanés', 
        color: [124, 58, 237] 
      },
      { 
        label: 'Charge quotidienne', 
        value: `${(totalHours / 5).toFixed(1)}h`, 
        sublabel: 'par jour ouvré', 
        color: [79, 70, 229] 
      }
    ];
    
    const perfBoxWidth = 47;
    const perfBoxHeight = 38;
    const perfSpacing = 8;
    const perfStartX = (pageWidth - (perfBoxWidth * 4 + perfSpacing * 3)) / 2;
    
    performanceMetrics.forEach((metric, index) => {
      const x = perfStartX + index * (perfBoxWidth + perfSpacing);
      
      // Ombre
      pdf.setFillColor(0, 0, 0, 20);
      pdf.roundedRect(x + 2, yPosition + 2, perfBoxWidth, perfBoxHeight, 5, 5, 'F');
      
      // Boîte principale
      pdf.setFillColor(...metric.color);
      pdf.roundedRect(x, yPosition, perfBoxWidth, perfBoxHeight, 5, 5, 'F');
      
      // Valeur
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + perfBoxWidth/2, yPosition + 16, { align: 'center' });
      
      // Label
      pdf.setFontSize(9);
      pdf.text(metric.label, x + perfBoxWidth/2, yPosition + 24, { align: 'center' });
      
      // Sublabel
      pdf.setFontSize(8);
      pdf.text(metric.sublabel, x + perfBoxWidth/2, yPosition + 32, { align: 'center' });
    });
    
    yPosition += 55;
    
    // Analyse des tendances avec fond coloré et lisibilité améliorée
    pdf.setFillColor(249, 250, 251);
    pdf.roundedRect(10, yPosition, pageWidth - 20, 70, 5, 5, 'F');
    
    pdf.setFillColor(5, 150, 105);
    pdf.roundedRect(15, yPosition + 5, pageWidth - 30, 18, 3, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('🔍 ANALYSE DES TENDANCES', 20, yPosition + 16);
    
    pdf.setTextColor(31, 41, 55); // Texte en noir foncé pour une meilleure lisibilité
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    
    const trends = [
      `• Productivité globale: ${productivityRate.toFixed(1)}% (${productiveHours.toFixed(1)}h productives sur ${totalHours.toFixed(1)}h totales)`,
      `• Charge de travail: ${avgHoursPerEmployee.toFixed(1)}h par employé en moyenne`,
      `• Répartition: ${totalProjects} projet${totalProjects > 1 ? 's' : ''} actif${totalProjects > 1 ? 's' : ''} pour ${totalEmployees} employé${totalEmployees > 1 ? 's' : ''}`,
      `• Validation en attente: ${dashboardData.semaines_a_valider?.length || 0} semaine${(dashboardData.semaines_a_valider?.length || 0) > 1 ? 's' : ''} à traiter`
    ];
    
    trends.forEach((trend, index) => {
      const lines = pdf.splitTextToSize(trend, pageWidth - 40);
      pdf.text(lines, 20, yPosition + 35 + (index * 10));
    });
    
    // Recommandations
    yPosition += 80;
    
    pdf.setFillColor(22, 163, 74);
    pdf.roundedRect(15, yPosition, pageWidth - 30, 18, 3, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('💡 RECOMMANDATIONS', 20, yPosition + 12);
    
    yPosition += 25;
    
    pdf.setTextColor(31, 41, 55);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    
    const recommendations = [];
    
    if (productivityRate < 70) {
      recommendations.push('Améliorer la productivité en réduisant les tâches non-productives');
    }
    if (avgHoursPerEmployee < 30) {
      recommendations.push('Augmenter la charge de travail ou optimiser la répartition des tâches');
    }
    if ((dashboardData.semaines_a_valider?.length || 0) > 5) {
      recommendations.push('Accélérer le processus de validation des imputations');
    }
    if (totalProjects < totalEmployees) {
      recommendations.push('Considérer l\'attribution de projets supplémentaires');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Performance globale satisfaisante, maintenir le niveau actuel');
    }
    
    recommendations.forEach((rec, index) => {
      const lines = pdf.splitTextToSize(`• ${rec}`, pageWidth - 40);
      pdf.text(lines, 20, yPosition + (index * 10));
    });
    
    // Pied de page enrichi
    const now2 = new Date();
    pdf.setFillColor(243, 244, 246);
    pdf.rect(0, pageHeight - 25, pageWidth, 25, 'F');
    
    pdf.setTextColor(75, 85, 99);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Rapport généré le ${format(now2, 'dd/MM/yyyy à HH:mm', { locale: fr })} | Données de la semaine courante`,
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );
    
    // Sauvegarde du PDF
    const fileName = `Rapport_Synthese_Global_Semaine_${format(weekStart, 'yyyy-MM-dd', { locale: fr })}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erreur lors de la génération du rapport de synthèse:', error);
    throw new Error('Impossible de générer le rapport de synthèse');
  }
};