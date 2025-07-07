import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Couleurs professionnelles améliorées
const CHART_COLORS = [
  '#1e40af', '#059669', '#dc2626', '#d97706', '#0891b2',
  '#16a34a', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5',
  '#9333ea', '#db2777', '#65a30d', '#ca8a04', '#0284c7'
];

interface PDFData {
  weekDates: string;
  totalHours: number;
  workingDays: number;
  totalActivities: number;
  dailyHours: { [date: string]: number };
  projectDistribution: { [project: string]: unknown };
  categoryDistribution: { [category: string]: unknown };
  activities: Array<{
    date: string;
    day: string;
    category: string;
    projectOrFormation: string;
    description: string;
    hours: number;
  }>;
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

  // Création des barres avec ombres et bordures
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

  // Création des labels d'axe X
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

  // Création de l'axe Y avec grille
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
  data: { label: string; value: unknown }[],
  colors: string[],
  options: {
    title?: string;
  }
): string => {
  const { width, height } = CHART_CONFIG.pieChart;
  const { title } = options;

  // Conversion et validation des données
  const validData = data
    .map(item => ({
      label: String(item.label),
      value: typeof item.value === 'number' ? item.value : Number(item.value) || 0
    }))
    .filter(item => !isNaN(item.value) && item.value > 0);

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

  // Légende améliorée
  const legendWidth = 250;
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

// Fonction optimisée pour ajouter des SVG au PDF avec qualité maximale
const addSVGToPDF = async (pdf: jsPDF, svg: string, x: number, y: number, width: number, height: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Créer un canvas haute résolution (x8)
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

      // Créer une image SVG
      const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      const img = new Image();
      img.onload = () => {
        try {
          // Dessiner avec qualité maximale
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

// Générer le graphique des heures quotidiennes
const generateDailyHoursChart = (dailyHours: { [date: string]: number }): string => {
  const labels = Object.keys(dailyHours).map(date => 
    format(new Date(date), 'EEE dd/MM', { locale: fr })
  );
  const values = Object.values(dailyHours);
  
  return generateBarChartSVG(labels, values, CHART_COLORS, {
    title: 'Répartition des heures par jour',
    yAxisTitle: 'Heures',
    xAxisTitle: 'Jours de la semaine'
  });
};

// Générer un graphique de répartition
const generateDistributionChart = (
  distribution: Record<string, unknown>,
  title: string
): string => {
  const chartData = Object.entries(distribution)
    .map(([label, value]) => ({
      label,
      value: typeof value === 'number' ? value : Number(value) || 0
    }))
    .filter(item => !isNaN(item.value) && item.value > 0);

  return generatePieChartSVG(chartData, CHART_COLORS, {
    title
  });
};

// Générer le rapport PDF complet avec graphiques haute résolution
export const generatePDFReport = async (data: PDFData): Promise<void> => {
  try {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      filters: ['ASCIIHexEncode']
    });
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // En-tête amélioré
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(26);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT D\'IMPUTATION HEBDOMADAIRE', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Période: ${data.weekDates}`, pageWidth / 2, 35, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 50;
    
    // Métriques clés avec style amélioré
    const metrics = [
      { label: 'Total des heures', value: `${data.totalHours.toFixed(1)}h`, color: '#1e40af' },
      { label: 'Jours travaillés', value: `${data.workingDays}`, color: '#059669' },
      { label: 'Activités', value: `${data.totalActivities}`, color: '#d97706' },
      { label: 'Moyenne/jour', value: `${(data.totalHours / data.workingDays).toFixed(1)}h`, color: '#0891b2' }
    ];
    
    const boxWidth = 45;
    const boxHeight = 30;
    const spacing = 8;
    const totalWidth = (boxWidth + spacing) * metrics.length - spacing;
    const startX = (pageWidth - totalWidth) / 2;
    
    metrics.forEach((metric, index) => {
      const x = startX + index * (boxWidth + spacing);
      
      // Ombre portée
      pdf.setFillColor(100, 100, 100, 20);
      pdf.roundedRect(x + 2, yPosition + 2, boxWidth, boxHeight, 3, 3, 'F');
      
      // Boîte principale
      pdf.setFillColor(metric.color);
      pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, 'F');
      
      // Valeur
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + boxWidth/2, yPosition + 15, { align: 'center' });
      
      // Label
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric.label, x + boxWidth/2, yPosition + 22, { align: 'center' });
    });
    
    yPosition += 45;
    
    // Graphique des heures quotidiennes
    if (Object.keys(data.dailyHours).length > 0) {
      const dailyChartSVG = generateDailyHoursChart(data.dailyHours);
      await addSVGToPDF(pdf, dailyChartSVG, 10, yPosition, 190, 130);
      yPosition += 140;
    }
    
    // Nouvelle page pour l'analyse
    pdf.addPage();
    yPosition = 20;
    
    // En-tête page 2
    pdf.setFillColor(5, 150, 105);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANALYSE DÉTAILLÉE', pageWidth / 2, 25, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Répartition du temps et indicateurs de performance', pageWidth / 2, 35, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 50;
    
    // Analyse par catégorie
    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition - 5, pageWidth - 20, 20, 'F');
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(' RÉPARTITION PAR CATÉGORIE', 15, yPosition + 8);
    yPosition += 30;

    // Calcul précis des catégories à partir des activités
    const realCategoryDistribution: Record<string, number> = {};
    data.activities.forEach(activity => {
      const hours = typeof activity.hours === 'number' ? activity.hours : Number(activity.hours) || 0;
      realCategoryDistribution[activity.category] = (realCategoryDistribution[activity.category] || 0) + hours;
    });

    if (Object.keys(realCategoryDistribution).length > 0) {
      const categoryPieSVG = generateDistributionChart(
        realCategoryDistribution,
        'Répartition par catégorie'
      );
      await addSVGToPDF(pdf, categoryPieSVG, 10, yPosition, 190, 120);
      yPosition += 130;
    }
    
    // Détail des catégories
    pdf.setFillColor(249, 250, 251);
    pdf.rect(10, yPosition, pageWidth - 20, 30, 'F');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Détail par catégorie:', 15, yPosition + 12);

    let categoryText = '';
    Object.entries(realCategoryDistribution).forEach(([category, hours]) => {
      const percentage = data.totalHours > 0 ? ((hours / data.totalHours) * 100).toFixed(1) : '0.0';
      categoryText += `• ${category}: ${hours.toFixed(1)}h (${percentage}%) `;
    });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    const lines = pdf.splitTextToSize(categoryText, pageWidth - 30);
    pdf.text(lines, 15, yPosition + 22);

    yPosition += 40;
    
    // Nouvelle page pour l'analyse par projet
    pdf.addPage();
    yPosition = 20;
    
    // Analyse par projet
    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition - 5, pageWidth - 20, 20, 'F');
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(' RÉPARTITION PAR PROJET', 15, yPosition + 8);
    yPosition += 30;
    
    if (Object.keys(data.projectDistribution).length > 0) {
      const projectPieSVG = generateDistributionChart(
        data.projectDistribution,
        'Répartition par projet'
      );
      await addSVGToPDF(pdf, projectPieSVG, 10, yPosition, 190, 120);
      yPosition += 130;
    }
    
    // Indicateurs de performance
    const avgHoursPerDay = data.totalHours / data.workingDays;
    const productivity = avgHoursPerDay >= 7 ? 'Excellente' : avgHoursPerDay >= 6 ? 'Bonne' : 'À améliorer';
    const productivityColor = avgHoursPerDay >= 7 ? '#16a34a' : avgHoursPerDay >= 6 ? '#d97706' : '#dc2626';
    
    // Nouvelle page pour les indicateurs
    pdf.addPage();
    yPosition = 20;
    
    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition - 5, pageWidth - 20, 20, 'F');
    
    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.text(' INDICATEURS DE PERFORMANCE', 15, yPosition + 8);
    yPosition += 30;
    
    const performanceMetrics = [
      { 
        label: 'Productivité', 
        value: productivity, 
        sublabel: `${avgHoursPerDay.toFixed(1)}h/jour`, 
        color: productivityColor 
      },
      { 
        label: 'Régularité', 
        value: `${((data.workingDays / 5) * 100).toFixed(0)}%`, 
        sublabel: `${data.workingDays}/5 jours`, 
        color: '#0891b2' 
      },
      { 
        label: 'Diversité', 
        value: `${Object.keys(data.projectDistribution).length}`, 
        sublabel: 'projets actifs', 
        color: '#7c3aed' 
      },
      { 
        label: 'Efficacité', 
        value: `${(data.totalActivities / data.workingDays).toFixed(1)}`, 
        sublabel: 'activités/jour', 
        color: '#4f46e5' 
      }
    ];
    
    const perfBoxWidth = 45;
    const perfBoxHeight = 35;
    const perfSpacing = 10;
    const perfStartX = (pageWidth - (perfBoxWidth * 4 + perfSpacing * 3)) / 2;
    
    performanceMetrics.forEach((metric, index) => {
      const x = perfStartX + index * (perfBoxWidth + perfSpacing);
      
      // Ombre
      pdf.setFillColor(100, 100, 100, 20);
      pdf.roundedRect(x + 2, yPosition + 2, perfBoxWidth, perfBoxHeight, 4, 4, 'F');
      
      // Boîte
      pdf.setFillColor(metric.color);
      pdf.roundedRect(x, yPosition, perfBoxWidth, perfBoxHeight, 4, 4, 'F');
      
      // Valeur
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + perfBoxWidth/2, yPosition + 15, { align: 'center' });
      
      // Label
      pdf.setFontSize(9);
      pdf.text(metric.label, x + perfBoxWidth/2, yPosition + 22, { align: 'center' });
      
      // Sous-label
      pdf.setFontSize(8);
      pdf.text(metric.sublabel, x + perfBoxWidth/2, yPosition + 30, { align: 'center' });
    });
    
    yPosition += 50;
    
    // Détail des activités
    pdf.addPage();
    yPosition = 20;
    
    // En-tête du tableau
    pdf.setFillColor(30, 64, 175);
    pdf.rect(10, yPosition - 5, pageWidth - 20, 20, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DÉTAIL DES ACTIVITÉS', 15, yPosition + 8);
    
    yPosition += 25;
    pdf.setTextColor(0, 0, 0);
    
    // En-têtes des colonnes
    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition - 3, pageWidth - 20, 15, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const headers = ['Date', 'Catégorie', 'Projet/Formation', 'Heures'];
    const colX = [15, 40, 90, 180];
    const colWidths = [25, 50, 90, 20];
    
    headers.forEach((header, index) => {
      pdf.text(header, colX[index], yPosition + 8);
    });
    
    yPosition += 15;
    
    // Données du tableau
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    data.activities.forEach((activity, index) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 30;
      }
      
      // Alternance des couleurs de ligne
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(10, yPosition - 2, pageWidth - 20, 12, 'F');
      }
      
      const hoursValue = typeof activity.hours === 'number' 
        ? activity.hours 
        : Number(activity.hours) || 0;

      const rowData = [
        format(new Date(activity.date), 'dd/MM', { locale: fr }),
        activity.category,
        activity.projectOrFormation.length > 35 
          ? activity.projectOrFormation.substring(0, 35) + '...' 
          : activity.projectOrFormation,
        `${hoursValue.toFixed(1)}h`
      ];
      
      rowData.forEach((data, colIndex) => {
        pdf.text(data, colX[colIndex], yPosition + 8);
      });
      
      yPosition += 12;
    });
    
    // Pied de page
    const now = new Date();
    pdf.setFillColor(243, 244, 246);
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    pdf.setTextColor(75, 85, 99);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Généré le ${format(now, 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(8);
    pdf.text('RAPPORT AUTOMATISÉ - © ' + new Date().getFullYear(), pageWidth - 15, pageHeight - 5, { align: 'right' });
    
    // Sauvegarde du PDF
    const fileName = `Rapport_Imputation_${data.weekDates.replace(/\s/g, '_')}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Impossible de générer le rapport PDF');
  }
};