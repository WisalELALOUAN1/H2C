import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  getManagerDashboard,
  validateWeek,
  getManagerProjects,
} from '../../services/api';
import { ManagerDashboardData, LightProject } from '../../types';
import {
  Clock,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  FileText,
  Calendar,
  Activity,
  Download
} from 'lucide-react';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
// Génération unifié des rapports
const generateUnifiedJSONReport = (data: any, filename: string, isProjectSpecific: boolean = false, projectName?: string) => {
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

type ReportDataCSV = {
  charge_par_projet:   Record<string, ProjectInfo>;
  charge_par_employe:  Record<string, number>;
  charge_par_categorie:Record<string, CategoryInfo>;
};
const generateUnifiedCSVReport = (data: any, filename: string): void => {
  /* --- petite fonction d’échappement CSV --------------------- */
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

  let csv = 'Type,Projet,Employe,Heures\r\n';

  /* 1.  Projets  – une ligne par (projet, employé) ------------ */
  Object.entries(data.charge_par_projet || {}).forEach(
    ([projet, { heures }]: [string, any]) => {
      Object.keys(data.charge_par_employe || {}).forEach(emp => {
        csv += `Projet,${esc(projet)},${esc(emp)},${heures}\r\n`;
      });
    }
  );

  /* 2.  Catégories  – une ligne par (catégorie ≠ “Projets”, employé) */
  Object.values(data.charge_par_categorie || {})
    .filter((cat: any) => cat.label !== 'Projets')
    .forEach((cat: any) => {
      Object.keys(data.charge_par_employe || {}).forEach(emp => {
        csv += `${esc(cat.label)},-\,${esc(emp)},${cat.heures}\r\n`;
      });
    });

  /* 3.  Téléchargement ---------------------------------------- */
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: filename }).click();
  URL.revokeObjectURL(url);
};
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

const CHART_COLORS = [
  '#1e40af', '#059669', '#dc2626', '#d97706', '#0891b2',
  '#16a34a', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5'
];

const generateUnifiedPDFReport = async (
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

  // Fonction pour générer un graphique en barres avec police très réduite
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

  // Fonction pour générer un diagramme circulaire avec taille réduite
 const generatePieChart = (
  data: { label: string; value: number }[],
  title: string
): string => {

  /* -- Réglages côté “look” ---------------------------------------- */
  const radius         = 30;   // mm
  const titleFontSize  = 6;    // pt
  const legendFontSize = 3;    // pt  (identique pour TOUTES les lignes)
  const legendGap      = 12;   // mm entre disque et légende
  const maxChars       = 40;   // on coupe vraiment au delà de 40 car.

  /* -- Chaînes de légende (libellé + pourcentage) ------------------ */
  const total = data.reduce((s, d) => s + d.value, 0);
  const legendStrings = data.map(({ label, value }) => {
    const clean = label.length > maxChars
      ? label.slice(0, maxChars - 1) + '…'
      : label;
    const pct   = total ? ((value / total) * 100).toFixed(1) : '0';
    return `${clean} (${pct} %)`;
  });

  /* -- Largeur minimale pour la légende ---------------------------- */
  // 0,8 mm ≃ largeur d’un caractère Helvetica 3 pt
  const longest     = Math.max(...legendStrings.map(s => s.length));
  const legendWidth = longest * legendFontSize * 0.8 + 18;  // 18 mm = carré + marge
  const width       = radius * 2 + legendGap + legendWidth;
  const height      = Math.max(radius * 2 + 22, legendStrings.length * 10);
  const center      = { x: radius + 5, y: height / 2 };      // 5 mm de marge à gauche

  /* -- Construction du SVG ---------------------------------------- */
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

  // Fonction pour générer l'analyse
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
    
    // Employé le plus actif
    const topEmployee = Object.entries(data.charge_par_employe)
      .sort((a, b) => b[1] - a[1])[0];
    
    // Catégorie dominante
    const topCategory = Object.values(data.charge_par_categorie)
      .sort((a, b) => b.heures - a.heures)[0];
    
    // Moyenne heures par employé
    const avgHoursPerEmployee = totalHours / totalEmployees;
    
    // Valeur totale générée
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

  // En-tête principal
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  
  const reportTitle = isProjectSpecific && projectName 
    ? `RAPPORT UNIFIÉ - PROJET: ${projectName.toUpperCase()}`
    : 'RAPPORT UNIFIÉ - ACTIVITÉ HEBDOMADAIRE';
  
  pdf.text(reportTitle, pageWidth / 2, 25, { align: 'center' });

  // Période couverte
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

  // Calcul des métriques principales
  const totalHours = Object.values(data.charge_par_employe).reduce((sum, h) => sum + h, 0);
  const totalProjects = Object.keys(data.charge_par_projet).length;
  const totalEmployees = Object.keys(data.charge_par_employe).length;
  const productiveHours = Object.values(data.charge_par_categorie)
    .filter(cat => cat.label === 'Projets')
    .reduce((sum, cat) => sum + cat.heures, 0);
  const productivityRate = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;

  // Affichage des métriques
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

  // Génération et affichage de l'analyse
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
    
    // Tableau détaillé
    pdf.setFillColor(243, 244, 246);
    pdf.rect(10, yPosition, pageWidth - 20, 10, 'F');
    
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Projet', 15, yPosition + 7);
    pdf.text('Heures', 120, yPosition + 7);
    pdf.text('Valeur (€)', 160, yPosition + 7);
    
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
      pdf.text(`${info.valeur.toFixed(2)}`, 160, yPosition + 5);
      
      yPosition += 8;
    });
  }

  // Section Employés
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
    await addSVGToPDF(pieChartSVG, 20, yPosition, 100, 80);  // Taille réduite
    yPosition += 90;  // Espacement réduit
    
    // Tableau détaillé
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

  // Section Catégories
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

  /* 1) Prépare les données pour le camembert */
  const categoriesData = Object.values(data.charge_par_categorie)
    .map(cat => ({ label: cat.label, value: cat.heures }));

  const pieChartSVG = generatePieChart(categoriesData, 'Heures par catégorie');
  await addSVGToPDF(pieChartSVG, 20, yPosition, 100, 80);   // camembert 100 × 80 mm
  yPosition += 90;                                          // laisse 10 mm de marge

  /* 2) ---- Mini-analyse ------------------------------------------------ */
  const totalCatHours = categoriesData.reduce((s, c) => s + c.value, 0);
  const topCat        = categoriesData
                          .slice()                 // copie pour ne pas modifier l’ordre
                          .sort((a, b) => b.value - a.value)[0];

  // % cumulé des 3 premières catégories (utile quand il y en a beaucoup)
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

/* ---------- PIED DE PAGE ---------------------------------------- */
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

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
          <div className="text-center p-8">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Erreur</h2>
            <button
              onClick={() => window.location.reload()}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors"
            >
              Recharger
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    brouillon: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Brouillon' },
    soumis: { color: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Soumis' },
    valide: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Validé' },
    rejete: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Rejeté' }
  };
  
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    label: status
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
      {config.label}
    </span>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string;
  label: string;
  gradient: string;
}> = ({ icon, value, label, gradient }) => (
  <div className={`${gradient} text-white p-6 rounded-xl shadow-lg transition-all duration-300 hover:-translate-y-1`}>
    <div className="flex justify-between mb-4">
      <div className="text-white/80">{icon}</div>
    </div>
    <div className="text-3xl font-bold mb-1">{value}</div>
    <div className="text-white/80 text-sm font-medium">{label}</div>
  </div>
);

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
  </div>
);

const TabNavigation: React.FC<{
  activeTab: number;
  onTabChange: (index: number) => void;
}> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { label: 'Tableau de bord', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'Validation', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Reporting', icon: <FileText className="w-5 h-5" /> }
  ];
  
  return (
    <div className="bg-gradient-to-r from-amber-800 to-amber-700 p-1 rounded-xl mb-8">
      <div className="flex space-x-1">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex-1 justify-center ${
              activeTab === index
                ? 'bg-amber-50 text-amber-800 shadow-md'
                : 'text-amber-100 hover:bg-amber-700/50'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const DashboardTab: React.FC<{
  dashboardData: ManagerDashboardData;
  loading: boolean;
}> = ({ dashboardData, loading }) => {
  if (loading) return <LoadingSpinner />;
  if (!dashboardData) return <div className="text-center py-12 text-gray-500">Aucune donnée</div>;
  
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Charge par projet</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Projet</th>
                  <th className="px-6 py-4 text-left">Heures</th>
                  <th className="px-6 py-4 text-left">Valeur</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(dashboardData.charge_par_projet || {}).map(([projet, data]: [string, any], index) => (
                  <tr key={projet} className={`border-b hover:bg-amber-50/30 ${
                    index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}>
                    <td className="px-6 py-4 font-semibold text-amber-800">{projet}</td>
                    <td className="px-6 py-4 font-bold">{data.heures.toFixed(2)}h</td>
                    <td className="px-6 py-4 font-bold text-green-600">
                      €{data.valeur.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Indicateurs</h3>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                <div className="text-sm text-amber-700 mb-1">Semaines à valider</div>
                <div className="text-2xl font-bold text-amber-800">
                  {dashboardData.semaines_a_valider?.length || 0}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
                <div className="text-sm text-red-700 mb-1">Projets en retard</div>
                <div className="text-2xl font-bold text-red-600">
                  {dashboardData.projets_en_retard || 0}
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-sky-50 to-sky-100 p-4 rounded-lg border border-sky-200">
                <div className="text-sm text-sky-700 mb-1">H. non productives</div>
                <div className="text-2xl font-bold text-sky-600">
                  {Object.values(dashboardData?.charge_par_categorie ?? {})
                    .filter(c => c.label !== 'Projets')
                    .reduce((t, c) => t + c.heures, 0)
                    .toFixed(1)}h
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-700 mb-1">Période</div>
                <div className="text-lg font-semibold text-gray-800">
                  {dashboardData.periode || 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Charge par catégorie */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Répartition par catégorie
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Catégorie</th>
                <th className="px-6 py-4 text-left">Heures</th>
                <th className="px-6 py-4 text-left">Pourcentage</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dashboardData?.charge_par_categorie ?? {})
                .map(([key, cat]: [string, any], idx) => {
                  const totalHours = Object.values(dashboardData?.charge_par_categorie ?? {})
                    .reduce((sum: number, c: any) => sum + c.heures, 0);
                  const percentage = totalHours > 0 ? (cat.heures / totalHours * 100) : 0;
                  
                  return (
                    <tr key={key}
                        className={`border-b hover:bg-amber-50/30 ${idx % 2 ? 'bg-amber-50/20' : 'bg-white'}`}>
                      <td className="px-6 py-4 font-semibold">{cat.label}</td>
                      <td className="px-6 py-4 font-bold text-amber-600">
                        {cat.heures.toFixed(1)} h
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Charge par employé</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Employé</th>
                <th className="px-6 py-4 text-left">Heures</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(dashboardData.charge_par_employe || {}).map(([employe, heures]: [string, any], index) => (
                <tr key={employe} className={`border-b hover:bg-amber-50/30 ${
                  index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                }`}>
                  <td className="px-6 py-4 font-semibold">{employe}</td>
                  <td className="px-6 py-4 font-bold text-amber-600">
                    {heures.toFixed(1)}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const ValidationTab: React.FC<{
  weeksToValidate: any[];
  loading: boolean;
  onValidate: (id: number, action: 'valider' | 'rejeter', comment?: string) => void;
}> = ({ weeksToValidate, loading, onValidate }) => {
  const [comment, setComment] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [selectedAction, setSelectedAction] = useState<'valider' | 'rejeter'>('valider');
  
  // Remove duplicates based on week ID
  const uniqueWeeks = useMemo(
    () => Array.from(
      new Map((weeksToValidate ?? [])
        .map(w => [w.id, w])).values()),
    [weeksToValidate]
  );
  
  if (loading) return <LoadingSpinner />;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <CheckCircle className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Validation des imputations</h2>
      </div>
      
      {uniqueWeeks.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          Aucune semaine à valider
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-amber-800 to-amber-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left">Employé</th>
                  <th className="px-6 py-4 text-left">Semaine</th>
                  <th className="px-6 py-4 text-left">Heures</th>
                  <th className="px-6 py-4 text-left">Statut</th>
                  <th className="px-6 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uniqueWeeks.map((week, index) => (
                  <tr key={week.id} className={`border-b hover:bg-amber-50/30 ${
                    index % 2 === 0 ? 'bg-amber-50/20' : 'bg-white'
                  }`}>
                    <td className="px-6 py-4 font-semibold">
                      {week.employe_nom}
                    </td>
                    <td className="px-6 py-4">
                      Semaine {week.semaine}, {week.annee}
                    </td>
                    <td className="px-6 py-4 font-bold text-amber-600">
                      {(week.total_heures ?? 0).toFixed(1)}h
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={week.statut} />
                    </td>
                    <td className="px-6 py-4 space-x-2">
                      <button
                        onClick={() => {
                          setSelectedWeek(week.id);
                          setSelectedAction('valider');
                          setComment('');
                        }}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Valider
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWeek(week.id);
                          setSelectedAction('rejeter');
                          setComment('');
                        }}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Rejeter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {selectedWeek && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            {selectedAction === 'valider' ? 'Confirmer la validation' : 'Motif de rejet'}
          </h3>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            placeholder={selectedAction === 'valider' ? 'Commentaire (optionnel)' : 'Motif de rejet (obligatoire)'}
            rows={3}
          />
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setSelectedWeek(null)}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => {
                onValidate(selectedWeek, selectedAction, comment);
                setSelectedWeek(null);
              }}
              className={`${
                selectedAction === 'valider' 
                  ? 'bg-green-500 hover:bg-green-600' 
                  : 'bg-red-500 hover:bg-red-600'
              } text-white px-4 py-2 rounded-lg transition-colors`}
            >
              {selectedAction === 'valider' ? 'Valider' : 'Rejeter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const getCurrentWeekRange = () => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1); // lundi

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6); // dimanche

  const toISO = (d: Date) => d.toISOString().split('T')[0];
  return { start: toISO(monday), end: toISO(sunday) };
};

const ReportingTab: React.FC<{
  onGenerateReport: (params: any) => void;
  loading: boolean;
  projects: LightProject[];
  dashboardData: ManagerDashboardData | null;
}> = ({ onGenerateReport, loading, projects, dashboardData }) => {
  const getCurrentWeekDates = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    
    return {
      start: format(weekStart, 'yyyy-MM-dd'),
      end: format(weekEnd, 'yyyy-MM-dd')
    };
  };
  
  const weekDates = getCurrentWeekDates();
  
  const [params, setParams] = useState({
    dateDebut: weekDates.start,
    dateFin: weekDates.end,
    projetId: '',
    format: 'json'
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateReport({
      ...params,
      dateDebut: weekDates.start,
      dateFin: weekDates.end
    });
  };
  
  // Calculate stats for the info box
  const totalHours = useMemo(() => {
    if (!dashboardData) return 0;
    return Object.values(dashboardData.charge_par_employe || {}).reduce((sum, hours) => sum + hours, 0);
  }, [dashboardData]);
  
  const totalProjects = useMemo(() => {
    if (!dashboardData) return 0;
    return Object.keys(dashboardData.charge_par_projet || {}).length;
  }, [dashboardData]);
  
  const totalEmployees = useMemo(() => {
    if (!dashboardData) return 0;
    return Object.keys(dashboardData.charge_par_employe || {}).length;
  }, [dashboardData]);
  
  // Calculate project-specific stats if a project is selected
  const selectedProjectStats = useMemo(() => {
    if (!params.projetId || !dashboardData) return null;
    
    const selectedProject = projects.find(p => p.id.toString() === params.projetId);
    if (!selectedProject) return null;
    
    const projectData = dashboardData.charge_par_projet?.[selectedProject.nom];
    if (!projectData) return null;
    
    const projectHours = projectData.heures;
    const projectValue = projectData.valeur;
    const projectPercentage = totalHours > 0 ? (projectHours / totalHours * 100) : 0;
    const efficiency = projectHours > 0 ? (projectValue / projectHours) : 0;
    
    return {
      name: selectedProject.nom,
      hours: projectHours,
      value: projectValue,
      percentage: projectPercentage,
      efficiency: efficiency
    };
  }, [params.projetId, dashboardData, projects, totalHours]);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <FileText className="w-8 h-8 text-amber-600" />
        <h2 className="text-2xl font-bold text-gray-800">Génération de rapports unifiés</h2>
      </div>
      
      {/* Statistics overview */}
      {selectedProjectStats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Heures projet</div>
            <div className="text-2xl font-bold text-blue-800">{selectedProjectStats.hours.toFixed(1)}h</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Valeur générée</div>
            <div className="text-2xl font-bold text-green-800">€{selectedProjectStats.value.toFixed(0)}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">% du total</div>
            <div className="text-2xl font-bold text-purple-800">{selectedProjectStats.percentage.toFixed(1)}%</div>
          </div>
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="text-sm text-orange-700 mb-1">Efficacité</div>
            <div className="text-2xl font-bold text-orange-800">€{selectedProjectStats.efficiency.toFixed(1)}/h</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-blue-700 mb-1">Total heures</div>
            <div className="text-2xl font-bold text-blue-800">{totalHours.toFixed(1)}h</div>
          </div>
          <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
            <div className="text-sm text-green-700 mb-1">Projets actifs</div>
            <div className="text-2xl font-bold text-green-800">{totalProjects}</div>
          </div>
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="text-sm text-purple-700 mb-1">Employés</div>
            <div className="text-2xl font-bold text-purple-800">{totalEmployees}</div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Période du rapport : Semaine courante
            </h4>
            <p className="text-sm text-amber-700">
              Du {new Date(weekDates.start).toLocaleDateString('fr-FR')} au {new Date(weekDates.end).toLocaleDateString('fr-FR')}
            </p>
          </div>
          
          
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Format
            </label>
            <select
              value={params.format}
              onChange={(e) => setParams({...params, format: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="json">JSON Unifié</option>
              <option value="csv">CSV Unifié</option>
              <option value="pdf">PDF Unifié</option>
            </select>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-800 mb-2 flex items-center">
              <Download className="w-4 h-4 mr-2" />
              Rapports unifiés - Toutes les données incluses :
            </h4>
            <ul className="text-sm text-green-700 space-y-1">
              <li><strong>JSON Unifié :</strong> Toutes les données avec métadonnées, résumé et analyses complètes</li>
              <li><strong>CSV Unifié :</strong> Toutes les sections (projets, employés, catégories) dans un seul fichier</li>
              <li><strong>PDF Unifié :</strong> Rapport complet avec métriques, graphiques et recommandations</li>
            </ul>
          </div>
          
          {params.projetId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-2">
                📊 Rapport focalisé sur le projet sélectionné
              </h4>
              <p className="text-sm text-blue-700">
                Le rapport contiendra toutes les informations mais avec un focus sur le projet "{projects.find(p => p.id.toString() === params.projetId)?.nom}".
              </p>
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
              <span>{loading ? 'Génération...' : 'Générer le rapport unifié'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null);
  const [projects, setProjects] = useState<LightProject[]>([]);
  const [loading, setLoading] = useState({
    dashboard: false,
    validation: false,
    reporting: false
  });
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (user && user.role === 'manager') {
      loadDashboardData();
      loadProjects();
    }
  }, [user]);
  
  const loadDashboardData = async () => {
    setLoading(prev => ({...prev, dashboard: true}));
    try {
      const data = await getManagerDashboard();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de chargement des données');
    } finally {
      setLoading(prev => ({...prev, dashboard: false}));
    }
  };
  
  const loadProjects = async () => {
    try {
      const projectsData = await getManagerProjects();
      setProjects(projectsData);
    } catch (err) {
      console.error('Erreur lors du chargement des projets:', err);
    }
  };
  
  const handleValidateWeek = async (id: number, action: 'valider' | 'rejeter', comment = '') => {
    setLoading(prev => ({...prev, validation: true}));
    try {
      await validateWeek(id, action, comment);
      await loadDashboardData();
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError(`Erreur lors de la ${action === 'valider' ? 'validation' : 'rejet'}`);
    } finally {
      setLoading(prev => ({...prev, validation: false}));
    }
  };
  
  const handleGenerateReport = async (params: any) => {
    if (!dashboardData) {
      setError('Aucune donnée disponible pour générer le rapport');
      return;
    }
    
    setLoading(prev => ({...prev, reporting: true}));
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const selectedProject = params.projetId ? projects.find(p => p.id.toString() === params.projetId) : null;
      const projectName = selectedProject?.nom || 'Tous_Projets';
      const isProjectSpecific = !!params.projetId;
      
      // Prepare filtered data based on project selection
      let filteredData = { ...dashboardData };
      
      if (isProjectSpecific && selectedProject) {
        const projectData = dashboardData.charge_par_projet?.[selectedProject.nom];
        
        if (projectData) {
          filteredData = {
            ...dashboardData,
            charge_par_projet: {
              [selectedProject.nom]: projectData
            }
          };
        }
      }
      
      switch (params.format) {
        case 'json':
          generateUnifiedJSONReport(
            filteredData,
            `rapport_unifie_${projectName}_${timestamp}.json`,
            isProjectSpecific,
            selectedProject?.nom
          );
          break;
          
        case 'csv':
          generateUnifiedCSVReport(
            filteredData,
            `rapport_unifie_${projectName}_${timestamp}.csv`,
            
          );
          break;
          
        case 'pdf':
          await generateUnifiedPDFReport(
            filteredData,
            `rapport_unifie_${projectName}_${timestamp}.pdf`,
            isProjectSpecific,
            selectedProject?.nom
          );
          break;
          
        default:
          throw new Error('Format de rapport non supporté');
      }
      
      setError(null);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur de génération du rapport');
    } finally {
      setLoading(prev => ({...prev, reporting: false}));
    }
  };
  
  // Calculate non-productive hours for stat card
  const nonProductiveHours = useMemo(() => {
    if (!dashboardData?.charge_par_categorie) return '0';
    return Object.values(dashboardData.charge_par_categorie)
      .filter(c => c.label !== 'Projets')
      .reduce((t, c) => t + c.heures, 0)
      .toFixed(1);
  }, [dashboardData]);
  
  if (!user || user.role !== 'manager') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50 flex items-center justify-center">
        <div className="text-center p-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Accès non autorisé</h2>
          <p className="text-gray-600 mb-4">Seuls les managers peuvent accéder à cette page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-800 to-amber-600 bg-clip-text text-transparent mb-2">
              Tableau de Bord Manager
            </h1>
            <p className="text-lg text-amber-700 font-medium">
              {user.prenom} {user.nom}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex justify-between">
              <div className="flex items-center space-x-2">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)}>
                <XCircle className="w-5 h-5" />
              </button>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            <StatCard
              icon={<Users className="w-8 h-8" />}
              value={dashboardData?.equipes?.length?.toString() || '0'}
              label="Équipes"
              gradient="bg-gradient-to-br from-amber-600 to-amber-700"
            />
            <StatCard
              icon={<CheckCircle className="w-8 h-8" />}
              value={dashboardData?.semaines_a_valider?.length?.toString() || '0'}
              label="À valider"
              gradient="bg-gradient-to-br from-orange-600 to-orange-700"
            />
            <StatCard
              icon={<XCircle className="w-8 h-8" />}
              value={dashboardData?.projets_en_retard?.toString() || '0'}
              label="Retards"
              gradient="bg-gradient-to-br from-red-600 to-red-700"
            />
            <StatCard
              icon={<Activity className="w-8 h-8" />}
              value={`${nonProductiveHours}h`}
              label="H. non productives"
              gradient="bg-gradient-to-br from-sky-600 to-sky-700"
            />
            <StatCard
              icon={<Calendar className="w-8 h-8" />}
              value={dashboardData?.periode || 'N/A'}
              label="Période"
              gradient="bg-gradient-to-br from-yellow-600 to-yellow-700"
            />
          </div>
          
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            {activeTab === 0 && (
              <DashboardTab 
                dashboardData={dashboardData!} 
                loading={loading.dashboard} 
              />
            )}
            {activeTab === 1 && (
              <ValidationTab
                weeksToValidate={dashboardData?.semaines_a_valider || []}
                loading={loading.validation}
                onValidate={handleValidateWeek}
              />
            )}
            {activeTab === 2 && (
              <ReportingTab
                onGenerateReport={handleGenerateReport}
                loading={loading.reporting}
                projects={projects}
                dashboardData={dashboardData}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ManagerDashboard;