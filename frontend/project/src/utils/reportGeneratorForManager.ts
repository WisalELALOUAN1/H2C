import jsPDF from 'jspdf';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ManagerDashboardData, LightProject } from '../types';

export const generateUnifiedJSONReport = (data: any, filename: string, isProjectSpecific: boolean = false, projectName?: string) => {
  const reportData = {
    metadata: {
      type: isProjectSpecific ? 'project-specific' : 'global',
      projectName: isProjectSpecific ? projectName : null,
      generatedAt: new Date().toISOString(),
      period: `Semaine courante`,
      format: 'json'
    },
    summary: {
      totalHours: Object.values(data.charge_par_employe || {}).reduce((sum: number, h: any) => sum + h, 0),
      totalProjects: Object.keys(data.charge_par_projet || {}).length,
      totalEmployees: Object.keys(data.charge_par_employe || {}).length,
      totalCategories: Object.keys(data.charge_par_categorie || {}).length,
      productiveHours: Object.values(data.charge_par_categorie || {})
        .filter((cat: any) => cat.label === 'Projets')
        .reduce((sum: number, cat: any) => sum + cat.heures, 0),
      weeksPendingValidation: data.semaines_a_valider?.length || 0
    },
    detailedData: {
      charge_par_projet: data.charge_par_projet || {},
      charge_par_employe: data.charge_par_employe || {},
      charge_par_categorie: data.charge_par_categorie || {},
      semaines_a_valider: data.semaines_a_valider || [],
      projets_en_retard: data.projets_en_retard || 0,
      periode: data.periode || 'N/A'
    },
    analytics: {
      productivityRate: (() => {
        const total = Object.values(data.charge_par_employe || {}).reduce((sum: number, h: any) => sum + h, 0);
        const productive = Object.values(data.charge_par_categorie || {})
          .filter((cat: any) => cat.label === 'Projets')
          .reduce((sum: number, cat: any) => sum + cat.heures, 0);
        return total > 0 ? (productive / total * 100) : 0;
      })(),
      averageHoursPerEmployee: (() => {
        const total = Object.values(data.charge_par_employe || {}).reduce((sum: number, h: any) => sum + h, 0);
        const count = Object.keys(data.charge_par_employe || {}).length;
        return count > 0 ? total / count : 0;
      })(),
      projectDistribution: Object.entries(data.charge_par_projet || {}).map(([name, info]: [string, any]) => ({
        name,
        hours: info.heures,
        value: info.valeur,
        percentage: (() => {
          const total = Object.values(data.charge_par_projet || {}).reduce((sum: number, p: any) => sum + p.heures, 0);
          return total > 0 ? (info.heures / total * 100) : 0;
        })()
      })),
      categoryDistribution: Object.entries(data.charge_par_categorie || {}).map(([key, cat]: [string, any]) => ({
        key,
        label: cat.label,
        hours: cat.heures,
        percentage: (() => {
          const total = Object.values(data.charge_par_categorie || {}).reduce((sum: number, c: any) => sum + c.heures, 0);
          return total > 0 ? (cat.heures / total * 100) : 0;
        })()
      })),
      employeePerformance: Object.entries(data.charge_par_employe || {}).map(([name, hours]: [string, any]) => {
        const avgHours = Object.values(data.charge_par_employe || {}).reduce((sum: number, h: any) => sum + h, 0) / Object.keys(data.charge_par_employe || {}).length;
        return {
          name,
          hours,
          performance: hours >= avgHours ? 'Au-dessus' : 'En-dessous',
          deviationFromAverage: hours - avgHours
        };
      })
    }
  };

  const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const generateUnifiedCSVReport = (data: any, filename: string): void => {

  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  let csv = 'Type,Projet,Employe,Heures\r\n';

 
  Object.entries(data.charge_par_projet || {}).forEach(
    ([projet, { heures }]: [string, any]) => {
      Object.keys(data.charge_par_employe || {}).forEach(emp => {
        csv += `Projet,${esc(projet)},${esc(emp)},${heures}\r\n`;
      });
    }
  );

  Object.values(data.charge_par_categorie || {})
    .filter((cat: any) => cat.label !== 'Projets')
    .forEach((cat: any) => {
      Object.keys(data.charge_par_employe || {}).forEach(emp => {
        csv += `${esc(cat.label)},-\,${esc(emp)},${cat.heures}\r\n`;
      });
    });


  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};
const CHART_COLORS = [
  '#1e40af', '#059669', '#dc2626', '#d97706', '#0891b2',
  '#16a34a', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5'
];
interface ProjectInfo {
  heures: number;
  valeur: number;
}

interface CategoryInfo {
  label: string;
  heures: number;
}
interface ReportData {
  charge_par_projet: Record<string, ProjectInfo>;
  charge_par_employe: Record<string, number>;
  charge_par_categorie: Record<string, CategoryInfo>;
  semaines_a_valider?: unknown[];
}
export const generateUnifiedPDFReport = async (
  data: ReportData,
  filename: string,
  isProjectSpecific: boolean = false,
  projectName?: string
): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
    filters: ['ASCIIHexEncode']
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;


  const generateBarChart = (labels: string[], values: number[], title: string): string => {
    const width = 190;
    const height = 100;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff" rx="4" ry="4" />
        <text x="${width/2}" y="15" text-anchor="middle" font-size="6" font-weight="bold">${title}</text>
        ${values.map((value, i) => {
          const barWidth = 20;
          const barX = margin.left + (i * 30);
          const barHeight = (value / Math.max(...values, 1)) * (height - margin.top - margin.bottom);
          const barY = height - margin.bottom - barHeight;
          
          return `
            <rect x="${barX}" y="${barY}" width="${barWidth}" height="${barHeight}" 
                  fill="${CHART_COLORS[i % CHART_COLORS.length]}" rx="2" />
            <text x="${barX + barWidth/2}" y="${barY - 5}" text-anchor="middle" font-size="5">
              ${value.toFixed(1)}
            </text>
          `;
        }).join('')}
        <line x1="${margin.left}" y1="${height - margin.bottom}" 
              x2="${width - margin.right}" y2="${height - margin.bottom}" 
              stroke="#000000" stroke-width="1" />
        ${labels.map((label, i) => {
          const labelX = margin.left + (i * 30) + 10;
          const labelY = height - 25;
          return `
            <text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="5" transform="rotate(45, ${labelX}, ${labelY})">
              ${label}
            </text>
          `;
        }).join('')}
      </svg>
    `;
  };


 const generatePieChart = (
  data: { label: string; value: number }[],
  title: string
): string => {


  const radius         = 30;   
  const titleFontSize  = 6;    
  const legendFontSize = 3;    
  const legendGap      = 12;   
  const maxChars       = 40;  


  const total = data.reduce((s, d) => s + d.value, 0);
  const legendStrings = data.map(({ label, value }) => {
    const clean = label.length > maxChars
      ? label.slice(0, maxChars - 1) + '…'
      : label;
    const pct   = total ? ((value / total) * 100).toFixed(1) : '0';
    return `${clean} (${pct} %)`;
  });


  const longest     = Math.max(...legendStrings.map(s => s.length));
  const legendWidth = longest * legendFontSize * 0.8 + 18;  
  const width       = radius * 2 + legendGap + legendWidth;
  const height      = Math.max(radius * 2 + 22, legendStrings.length * 10);
  const center      = { x: radius + 5, y: height / 2 };      


  let cumAngle = 0;
  return `
<svg width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">

  <!-- Fond -->
  <rect width="100%" height="100%" fill="#ffffff" rx="4" ry="4"/>

  <!-- Titre -->
  <text x="${width / 2}" y="9" text-anchor="middle"
        font-family="Helvetica,Arial" font-weight="bold"
        font-size="${titleFontSize}pt">${title}</text>

  <!-- Parts -->
  ${data.map(({ value }, i) => {
      const angle = (value / total) * 360;
      const start = cumAngle; cumAngle += angle;
      const large = angle > 180 ? 1 : 0;
      const x1 = center.x;
      const y1 = center.y;
      const x2 = x1 + radius * Math.cos(start * Math.PI / 180);
      const y2 = y1 + radius * Math.sin(start * Math.PI / 180);
      const x3 = x1 + radius * Math.cos((start + angle) * Math.PI / 180);
      const y3 = y1 + radius * Math.sin((start + angle) * Math.PI / 180);
      return `
        <path d="M${x1},${y1} L${x2},${y2}
                 A${radius},${radius} 0 ${large} 1 ${x3},${y3} Z"
              fill="${CHART_COLORS[i % CHART_COLORS.length]}"
              stroke="#ffffff" stroke-width="1"/>`;
    }).join('')}

  <!-- Légende -->
  ${legendStrings.map((txt, i) => {
      const lx = radius * 2 + legendGap;
      const ly = 22 + i * 10;                     // 10 mm par ligne
      return `
        <rect x="${lx}" y="${ly - 4}" width="8" height="8"
              fill="${CHART_COLORS[i % CHART_COLORS.length]}"/>
        <text x="${lx + 11}" y="${ly + 1}"
              font-family="Helvetica,Arial"
              font-size="${legendFontSize}pt"
              font-weight="normal"
              text-anchor="start">${txt}</text>`;
    }).join('')}

</svg>`;
};

  // Fonction pour ajouter un SVG au PDF
  const addSVGToPDF = async (svg: string, x: number, y: number, width: number, height: number): Promise<void> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = width * 5;
        canvas.height = height * 5;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const pngData = canvas.toDataURL('image/png');
        pdf.addImage(pngData, 'PNG', x, y, width, height);
        resolve();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)));
    });
  };

  // Fonction pour generer l'analyse
  const generateAnalysis = (data: ReportData): string => {
    const totalHours = Object.values(data.charge_par_employe).reduce((sum, h) => sum + h, 0);
    const totalProjects = Object.keys(data.charge_par_projet).length;
    const totalEmployees = Object.keys(data.charge_par_employe).length;
    
    const productiveHours = Object.values(data.charge_par_categorie)
      .filter(cat => cat.label === 'Projets')
      .reduce((sum, cat) => sum + cat.heures, 0);
    const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    
    // Projet le plus consommateur
    const topProject = Object.entries(data.charge_par_projet)
      .sort((a, b) => b[1].heures - a[1].heures)[0];
    
    // Employe le plus actif
    const topEmployee = Object.entries(data.charge_par_employe)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Categorie dominante
    const topCategory = Object.values(data.charge_par_categorie)
      .sort((a, b) => b.heures - a.heures)[0];
    
    // Moyenne heures par employe
    const avgHoursPerEmployee = totalHours / totalEmployees;
    
    // Valeur totale 
    const totalValue = Object.values(data.charge_par_projet)
      .reduce((sum, proj) => sum + proj.valeur, 0);
    
    let analysis = `ANALYSE DÉTAILLÉE\n\n`;
    analysis += `Performance Globale:\n`;
    analysis += `• ${totalHours.toFixed(1)} heures travaillées au total\n`;
    analysis += `• Taux de productivité: ${productivityRate.toFixed(1)}%\n`;
    analysis += `• Valeur générée: ${totalValue.toFixed(2)}€\n`;
    analysis += `• Ratio valeur/heure: ${(totalValue/totalHours).toFixed(2)}€/h\n\n`;
    
    analysis += `Projets:\n`;
    analysis += `• ${totalProjects} projets actifs\n`;
    if (topProject) {
      analysis += `• Projet principal: ${topProject[0]} (${topProject[1].heures.toFixed(1)}h)\n`;
      analysis += `• Représente ${((topProject[1].heures/totalHours)*100).toFixed(1)}% du temps total\n`;
    }
    analysis += `\n`;
    
    analysis += `Ressources Humaines:\n`;
    analysis += `• ${totalEmployees} employés actifs\n`;
    analysis += `• Moyenne: ${avgHoursPerEmployee.toFixed(1)}h/employé\n`;
    if (topEmployee) {
      analysis += `• Employé le plus actif: ${topEmployee[0]} (${topEmployee[1].toFixed(1)}h)\n`;
    }
    analysis += `\n`;
    
    analysis += `Répartition des Activités:\n`;
    if (topCategory) {
      analysis += `• Catégorie dominante: ${topCategory.label} (${topCategory.heures.toFixed(1)}h)\n`;
      analysis += `• Représente ${((topCategory.heures/totalHours)*100).toFixed(1)}% du temps\n`;
    }
    
    // Recommandations
    analysis += `\nRECOMMANDATIONS:\n`;
    if (productivityRate < 70) {
      analysis += `• Améliorer la productivité (actuellement ${productivityRate.toFixed(1)}%)\n`;
    }
    if (totalValue/totalHours < 50) {
      analysis += `• Optimiser la rentabilité des projets\n`;
    }
    if (topProject && (topProject[1].heures/totalHours) > 0.5) {
      analysis += `• Diversifier le portefeuille de projets\n`;
    }
    
    return analysis;
  };


  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  
  const reportTitle = isProjectSpecific && projectName 
    ? `RAPPORT UNIFIÉ - PROJET: ${projectName.toUpperCase()}`
    : 'RAPPORT UNIFIÉ - ACTIVITÉ HEBDOMADAIRE';
  
  pdf.text(reportTitle, pageWidth / 2, 25, { align: 'center' });


  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Semaine du ${format(weekStart, 'dd/MM/yyyy', { locale: fr })} au ${format(weekEnd, 'dd/MM/yyyy', { locale: fr })}`,
    pageWidth / 2, 35, { align: 'center' }
  );
  
  pdf.setTextColor(0, 0, 0);
  yPosition = 50;


  const totalHours = Object.values(data.charge_par_employe).reduce((sum, h) => sum + h, 0);
  const totalProjects = Object.keys(data.charge_par_projet).length;
  const totalEmployees = Object.keys(data.charge_par_employe).length;
  const productiveHours = Object.values(data.charge_par_categorie)
    .filter(cat => cat.label === 'Projets')
    .reduce((sum, cat) => sum + cat.heures, 0);
  const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

 
  const metrics = [
    { title: 'Total Heures', value: `${totalHours.toFixed(1)}h`, color: '#1e40af' },
    { title: 'Projets', value: `${totalProjects}`, color: '#059669' },
    { title: 'Employés', value: `${totalEmployees}`, color: '#dc2626' },
    { title: 'Productivité', value: `${productivityRate.toFixed(1)}%`, color: '#d97706' }
  ];

  const boxWidth = 45;
  const boxHeight = 25;
  const spacing = 5;
  const startX = (pageWidth - (boxWidth * 4 + spacing * 3)) / 2;
  
  metrics.forEach((metric, index) => {
    const x = startX + index * (boxWidth + spacing);
    
    pdf.setFillColor(100, 100, 100, 10);
    pdf.roundedRect(x + 2, yPosition + 2, boxWidth, boxHeight, 3, 3, 'F');
    
    pdf.setFillColor(metric.color);
    pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 3, 3, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(metric.value, x + boxWidth/2, yPosition + 15, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.text(metric.title, x + boxWidth/2, yPosition + 22, { align: 'center' });
  });
  
  yPosition += 35;

  // Section Analyse
  pdf.addPage();
  yPosition = 20;
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text('ANALYSE ET RECOMMANDATIONS', 15, 12);
  
  pdf.setTextColor(0, 0, 0);
  yPosition = 30;


  const analysisText = generateAnalysis(data);
  const analysisLines = analysisText.split('\n');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  
  analysisLines.forEach((line) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
    
    if (line.includes('ANALYSE DÉTAILLÉE') || line.includes('RECOMMANDATIONS:')) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 64, 175);
      pdf.text(line, 15, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
    } else if (line.includes(':') && !line.startsWith('•')) {
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(5, 150, 105);
      pdf.text(line, 15, yPosition);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);
    } else {
      pdf.text(line, 15, yPosition);
    }
    
    yPosition += 5;
  });

  // Section Projets
  pdf.addPage();
  yPosition = 20;
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text('RÉPARTITION PAR PROJET', 15, 12);
  
  pdf.setTextColor(0, 0, 0);
  yPosition = 30;

  if (totalProjects > 0) {
    const projectsData = Object.entries(data.charge_par_projet)
      .sort((a, b) => b[1].heures - a[1].heures)
      .slice(0, 6);
    
    const labels = projectsData.map(([projet]) => projet.substring(0, 15));
    const values = projectsData.map(([_, info]) => info.heures);
    
    const barChartSVG = generateBarChart(labels, values, 'Heures par projet');
    await addSVGToPDF(barChartSVG, 10, yPosition, 190, 100);
    yPosition += 110;
    
    // Description du graphique
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80, 80, 80);
    pdf.text('Ce graphique présente la répartition des heures travaillées par projet,', 15, yPosition);
    pdf.text('permettant d\'identifier les projets les plus consommateurs en temps.', 15, yPosition + 5);
    pdf.text(`Les ${Math.min(6, totalProjects)} projets principaux représentent ${((values.reduce((sum, val) => sum + val, 0) / totalHours) * 100).toFixed(1)}% du temps total.`, 15, yPosition + 10);
    
    yPosition += 20;

    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition, pageWidth - 20, 10, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Projet', 15, yPosition + 7);
    pdf.text('Heures', 120, yPosition + 7);
   
    
    yPosition += 10;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    Object.entries(data.charge_par_projet).forEach(([projet, info], index) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(10, yPosition - 2, pageWidth - 20, 8, 'F');
      }
      
      pdf.text(projet.length > 25 ? projet.substring(0, 25) + '...' : projet, 15, yPosition + 5);
      pdf.text(`${info.heures.toFixed(1)}h`, 120, yPosition + 5);
     
      
      yPosition += 8;
    });
  }


  pdf.addPage();
  yPosition = 20;
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text('RÉPARTITION PAR EMPLOYÉ', 15, 12);
  
  pdf.setTextColor(0, 0, 0);
  yPosition = 30;

  if (totalEmployees > 0) {
    const employeesData = Object.entries(data.charge_par_employe)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([employe, heures]) => ({
        label: employe,
        value: heures
      }));
    
    const pieChartSVG = generatePieChart(employeesData, 'Heures par employé');
    await addSVGToPDF(pieChartSVG, 20, yPosition, 100, 80); 
    yPosition += 90;  
    
    
    const avgHoursPerEmployee = totalHours / totalEmployees;
    
    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition, pageWidth - 20, 10, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Employé', 15, yPosition + 7);
    pdf.text('Heures', 100, yPosition + 7);
    pdf.text('Performance', 140, yPosition + 7);
    
    yPosition += 10;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    
    Object.entries(data.charge_par_employe).forEach(([employe, heures], index) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = 20;
      }
      
      const performance = heures >= avgHoursPerEmployee ? 'Au-dessus' : 'En-dessous';
      const performanceColor = heures >= avgHoursPerEmployee ? '#059669' : '#dc2626';
      
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(10, yPosition - 2, pageWidth - 20, 8, 'F');
      }
      
      pdf.text(employe, 15, yPosition + 5);
      pdf.text(`${heures.toFixed(1)}h`, 100, yPosition + 5);
      
      pdf.setTextColor(performanceColor);
      pdf.text(performance, 140, yPosition + 5);
      
      yPosition += 8;
    });
  }


  pdf.addPage();
  yPosition = 20;
  
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 15, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.text('RÉPARTITION PAR CATÉGORIE', 15, 12);

pdf.setTextColor(0, 0, 0);
yPosition = 30;

if (Object.keys(data.charge_par_categorie).length > 0) {


  const categoriesData = Object.values(data.charge_par_categorie)
    .map(cat => ({ label: cat.label, value: cat.heures }));

  const pieChartSVG = generatePieChart(categoriesData, 'Heures par catégorie');
  await addSVGToPDF(pieChartSVG, 20, yPosition, 100, 80);   
  yPosition += 90;                                          


  const totalCatHours = categoriesData.reduce((s, c) => s + c.value, 0);
  const topCat        = categoriesData
                          .slice()                
                          .sort((a, b) => b.value - a.value)[0];


  const top3Share = categoriesData
                      .sort((a, b) => b.value - a.value)
                      .slice(0, 3)
                      .reduce((s, c) => s + c.value, 0);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(80, 80, 80);

  pdf.text(
    `• Catégorie dominante : “${topCat.label}” avec ${topCat.value.toFixed(1)} h ` +
    `(${((topCat.value / totalCatHours) * 100).toFixed(1)} % du total).`,
    15, yPosition
  );
  yPosition += 5;

  pdf.text(
    `• Les trois premières catégories représentent ` +
    `${((top3Share / totalCatHours) * 100).toFixed(1)} % du temps global.`,
    15, yPosition
  );
  yPosition += 10;
}


pdf.setFillColor(243, 244, 246);
pdf.rect(0, pageHeight - 15, pageWidth, 15, 'F');

pdf.setTextColor(100, 100, 100);
pdf.setFontSize(10);
pdf.setFont('helvetica', 'italic');
pdf.text(
  `Rapport généré le ${format(now, 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
  pageWidth / 2,
  pageHeight - 10,
  { align: 'center' }
);

pdf.save(filename);

};