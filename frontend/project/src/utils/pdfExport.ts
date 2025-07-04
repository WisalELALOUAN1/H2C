import jsPDF from 'jspdf';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Register Chart.js components
Chart.register(...registerables);

// Professional color palette
const COLORS = {
  primary: '#1e40af',      // Blue
  secondary: '#059669',    // Green
  accent: '#dc2626',       // Red
  warning: '#d97706',      // Orange
  info: '#0891b2',         // Cyan
  success: '#16a34a',      // Light Green
  purple: '#7c3aed',       // Purple
  pink: '#e11d48',         // Pink
  teal: '#0d9488',         // Teal
  indigo: '#4f46e5',       // Indigo
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827'
  }
};

// Professional chart colors
const CHART_COLORS = [
  '#1e40af', '#059669', '#dc2626', '#d97706', '#0891b2',
  '#16a34a', '#7c3aed', '#e11d48', '#0d9488', '#4f46e5',
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'
];

// Gradient colors for enhanced visuals
const GRADIENT_COLORS = [
  { start: '#1e40af', end: '#3b82f6' },
  { start: '#059669', end: '#10b981' },
  { start: '#dc2626', end: '#ef4444' },
  { start: '#d97706', end: '#f59e0b' },
  { start: '#0891b2', end: '#06b6d4' }
];

interface PDFData {
  weekDates: string;
  totalHours: number;
  workingDays: number;
  totalActivities: number;
  dailyHours: { [date: string]: number };
  projectDistribution: { [project: string]: number };
  categoryDistribution: { [category: string]: number };
  activities: Array<{
    date: string;
    day: string;
    category: string;
    projectOrFormation: string;
    description: string;
    hours: number;
  }>;
}

export const generatePDFReport = async (data: PDFData): Promise<void> => {
  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // Add header background
    pdf.setFillColor(30, 64, 175); // Primary blue
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    // Title with white text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RAPPORT D\'IMPUTATION HEBDOMADAIRE', pageWidth / 2, 20, { align: 'center' });
    
    // Week period in smaller white text
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Période: ${data.weekDates}`, pageWidth / 2, 30, { align: 'center' });
    
    // Reset text color for body
    pdf.setTextColor(0, 0, 0);
    yPosition = 50;
    
    // Key metrics section with colored boxes
    const metrics = [
      { label: 'Total des heures', value: `${data.totalHours.toFixed(1)}h`, color: COLORS.primary },
      { label: 'Jours travaillés', value: `${data.workingDays}`, color: COLORS.secondary },
      { label: 'Nombre d\'activités', value: `${data.totalActivities}`, color: COLORS.warning },
      { label: 'Moyenne/jour', value: `${(data.totalHours / data.workingDays).toFixed(1)}h`, color: COLORS.info }
    ];
    
    // Draw metric boxes
    const boxWidth = 40;
    const boxHeight = 25;
    const spacing = 5;
    const totalWidth = (boxWidth + spacing) * metrics.length - spacing;
    const startX = (pageWidth - totalWidth) / 2;
    
    metrics.forEach((metric, index) => {
      const x = startX + index * (boxWidth + spacing);
      
      // Colored box
      const rgb = hexToRgb(metric.color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.roundedRect(x, yPosition, boxWidth, boxHeight, 2, 2, 'F');
      
      // White text
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + boxWidth/2, yPosition + 10, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric.label, x + boxWidth/2, yPosition + 18, { align: 'center' });
    });
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 40;
    
    // Enhanced daily hours chart
    if (Object.keys(data.dailyHours).length > 0) {
      const dailyChart = await generateEnhancedDailyChart(data.dailyHours);
      const dailyImageData = canvasToImageData(dailyChart);
      
      pdf.addImage(dailyImageData, 'PNG', 15, yPosition, 180, 110);
      yPosition += 120;
    }
    
    // Add new page for analytics
    pdf.addPage();
    yPosition = 20;
    
    // Page 2 header
    pdf.setFillColor(5, 150, 105); // Green header for analytics page
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ANALYSE DÉTAILLÉE', pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Répartition du temps et indicateurs de performance', pageWidth / 2, 30, { align: 'center' });
    
    pdf.setTextColor(0, 0, 0);
    yPosition = 50;
    
    // Section 1: Category Analysis
    pdf.setFillColor(243, 244, 246);
    pdf.rect(15, yPosition - 5, pageWidth - 30, 15, 'F');
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('📊 ANALYSE PAR CATÉGORIE', 20, yPosition + 5);
    yPosition += 25;
    
    // Category charts side by side
    if (Object.keys(data.categoryDistribution).length > 0) {
      // Pie chart for categories
      const categoryPieChart = await generateEnhancedPieChart(
        data.categoryDistribution,
        'Répartition par catégorie',
        CHART_COLORS
      );
      const categoryPieImageData = canvasToImageData(categoryPieChart);
      
      pdf.addImage(categoryPieImageData, 'PNG', 15, yPosition, 85, 70);
      
      // Bar chart for categories (horizontal)
      const categoryBarChart = await generateCategoryBarChart(data.categoryDistribution);
      const categoryBarImageData = canvasToImageData(categoryBarChart);
      
      pdf.addImage(categoryBarImageData, 'PNG', 110, yPosition, 85, 70);
      
      yPosition += 80;
    }
    
    // Category statistics table
    pdf.setFillColor(249, 250, 251);
    pdf.rect(15, yPosition, pageWidth - 30, 25, 'F');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Détail par catégorie:', 20, yPosition + 10);
    
    let categoryText = '';
    Object.entries(data.categoryDistribution).forEach(([category, hours]) => {
      const percentage = ((hours / data.totalHours) * 100).toFixed(1);
      categoryText += `${category}: ${hours.toFixed(1)}h (${percentage}%) • `;
    });
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(categoryText.slice(0, -3), pageWidth - 40);
    pdf.text(lines, 20, yPosition + 18);
    
    yPosition += 35;
    
    // Section 2: Project Analysis
    pdf.setFillColor(243, 244, 246);
    pdf.rect(15, yPosition - 5, pageWidth - 30, 15, 'F');
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('🎯 ANALYSE PAR PROJET', 20, yPosition + 5);
    yPosition += 25;
    
    // Project charts
    if (Object.keys(data.projectDistribution).length > 0) {
      // Doughnut chart for projects
      const projectDoughnutChart = await generateEnhancedDoughnutChart(
        data.projectDistribution,
        'Répartition par projet',
        CHART_COLORS.slice(5)
      );
      const projectDoughnutImageData = canvasToImageData(projectDoughnutChart);
      
      pdf.addImage(projectDoughnutImageData, 'PNG', 15, yPosition, 85, 70);
      
      // Tree map style visualization for projects
      const projectTreeChart = await generateProjectTreeChart(data.projectDistribution);
      const projectTreeImageData = canvasToImageData(projectTreeChart);
      
      pdf.addImage(projectTreeImageData, 'PNG', 110, yPosition, 85, 70);
      
      yPosition += 80;
    }
    
    // Performance indicators section
    const avgHoursPerDay = data.totalHours / data.workingDays;
    const productivity = avgHoursPerDay >= 7 ? 'Excellente' : avgHoursPerDay >= 6 ? 'Bonne' : 'À améliorer';
    const productivityColor = avgHoursPerDay >= 7 ? COLORS.success : avgHoursPerDay >= 6 ? COLORS.warning : COLORS.accent;
    
    // Performance section with enhanced design
    pdf.setFillColor(243, 244, 246);
    pdf.rect(15, yPosition - 5, pageWidth - 30, 15, 'F');
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('⚡ INDICATEURS DE PERFORMANCE', 20, yPosition + 5);
    yPosition += 25;
    
    // Performance metrics boxes
    const performanceMetrics = [
      { label: 'Productivité', value: productivity, sublabel: `${avgHoursPerDay.toFixed(1)}h/jour`, color: productivityColor },
      { label: 'Régularité', value: `${((data.workingDays / 5) * 100).toFixed(0)}%`, sublabel: `${data.workingDays}/5 jours`, color: COLORS.info },
      { label: 'Diversité', value: `${Object.keys(data.projectDistribution).length}`, sublabel: 'projets actifs', color: COLORS.purple }
    ];
    
    const perfBoxWidth = 55;
    const perfBoxHeight = 30;
    const perfSpacing = 10;
    const perfStartX = 20;
    
    performanceMetrics.forEach((metric, index) => {
      const x = perfStartX + index * (perfBoxWidth + perfSpacing);
      
      const rgb = hexToRgb(metric.color);
      pdf.setFillColor(rgb.r, rgb.g, rgb.b);
      pdf.roundedRect(x, yPosition, perfBoxWidth, perfBoxHeight, 3, 3, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(metric.value, x + perfBoxWidth/2, yPosition + 12, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(metric.label, x + perfBoxWidth/2, yPosition + 20, { align: 'center' });
      pdf.text(metric.sublabel, x + perfBoxWidth/2, yPosition + 26, { align: 'center' });
    });
    
    pdf.setTextColor(0, 0, 0);
    yPosition += 45;
    
    // Trend analysis (if we have daily data)
    if (Object.keys(data.dailyHours).length > 1) {
      const trendChart = await generateTrendChart(data.dailyHours);
      const trendImageData = canvasToImageData(trendChart);
      
      pdf.addImage(trendImageData, 'PNG', 15, yPosition, 180, 60);
      yPosition += 70;
    }
    
    // Add new page for detailed activities
    pdf.addPage();
    yPosition = 20;
    
    // Enhanced activities table
    drawEnhancedTable(pdf, data.activities, yPosition);
    
    // Footer with enhanced styling
    const now = new Date();
    pdf.setFillColor(243, 244, 246); // Light gray background
    pdf.rect(0, pageHeight - 20, pageWidth, 20, 'F');
    
    pdf.setTextColor(75, 85, 99); // Gray text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.text(
      `Généré le ${format(now, 'dd/MM/yyyy à HH:mm', { locale: fr })}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    
    // Logo or watermark area (placeholder)
    pdf.setTextColor(200, 200, 200);
    pdf.setFontSize(6);
    pdf.text('RAPPORT AUTOMATISÉ', pageWidth - 15, pageHeight - 5, { align: 'right' });
    
    // Save the PDF
    const fileName = `rapport_imputation_${data.weekDates.replace(/\s/g, '_')}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Impossible de générer le rapport PDF');
  }
};

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Enhanced table drawing function
const drawEnhancedTable = (pdf: jsPDF, activities: any[], startY: number): void => {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = startY;
  
  // Table title with background
  pdf.setFillColor(30, 64, 175);
  pdf.rect(15, yPosition - 5, pageWidth - 30, 15, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DÉTAIL DES ACTIVITÉS', 20, yPosition + 5);
  
  yPosition += 20;
  pdf.setTextColor(0, 0, 0);
  
  // Table headers with background
  pdf.setFillColor(243, 244, 246);
  pdf.rect(15, yPosition - 3, pageWidth - 30, 12, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  const headers = ['Date', 'Catégorie', 'Projet/Formation', 'Heures'];
  const colWidths = [25, 45, 85, 25];
  const colX = [20, 45, 90, 175];
  
  headers.forEach((header, index) => {
    pdf.text(header, colX[index], yPosition + 5);
  });
  
  yPosition += 15;
  
  // Table data with alternating row colors
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  activities.forEach((activity, index) => {
    if (yPosition > pageHeight - 30) {
      pdf.addPage();
      yPosition = 30;
    }
    
    // Alternating row background
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(15, yPosition - 2, pageWidth - 30, 10, 'F');
    }
    
    const rowData = [
      format(new Date(activity.date), 'dd/MM', { locale: fr }),
      activity.category,
      activity.projectOrFormation.length > 30 ? 
        activity.projectOrFormation.substring(0, 30) + '...' : 
        activity.projectOrFormation,
      `${Number(activity.hours).toFixed(1)}h`
    ];
    
    rowData.forEach((data, colIndex) => {
      pdf.text(data, colX[colIndex], yPosition + 5);
    });
    
    yPosition += 10;
  });
};

// Enhanced chart creation
const createEnhancedCanvas = (config: ChartConfiguration): Promise<HTMLCanvasElement> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    
    const chart = new Chart(ctx, config);
    
    setTimeout(() => {
      resolve(canvas);
      chart.destroy();
    }, 200);
  });
};

// Enhanced daily chart with gradient
const generateEnhancedDailyChart = async (dailyHours: { [date: string]: number }): Promise<HTMLCanvasElement> => {
  const labels = Object.keys(dailyHours).map(date => 
    format(new Date(date), 'EEE dd/MM', { locale: fr })
  );
  const values = Object.values(dailyHours);
  
  const config: ChartConfiguration = {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Heures par jour',
        data: values,
        backgroundColor: values.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
        borderColor: values.map((_, index) => CHART_COLORS[index % CHART_COLORS.length]),
        borderWidth: 2,
        borderRadius: 4,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: 'Répartition des heures par jour',
          font: { size: 20, weight: 'bold' },
          color: '#1f2937',
          padding: 20
        },
        legend: { 
          display: false 
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 6,
          displayColors: true
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Heures',
            font: { size: 14, weight: 'bold' },
            color: '#374151'
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          },
          ticks: {
            color: '#6b7280'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Jours de la semaine',
            font: { size: 14, weight: 'bold' },
            color: '#374151'
          },
          grid: {
            display: false
          },
          ticks: {
            color: '#6b7280'
          }
        }
      }
    }
  };
  
  return createEnhancedCanvas(config);
};

// Enhanced pie chart
const generateEnhancedPieChart = async (
  data: { [key: string]: number },
  title: string,
  colors: string[]
): Promise<HTMLCanvasElement> => {
  const labels = Object.keys(data);
  const values = Object.values(data);
  
  const config: ChartConfiguration = {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    },
    options: {
      responsive: false,
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 18, weight: 'bold' },
          color: '#1f2937',
          padding: 20
        },
        legend: {
          position: 'bottom',
          labels: { 
            font: { size: 12 },
            color: '#374151',
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 6,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed}h (${percentage}%)`;
            }
          }
        }
      }
    }
  };
  
  return createEnhancedCanvas(config);
};

// Enhanced doughnut chart
const generateEnhancedDoughnutChart = async (
  data: { [key: string]: number },
  title: string,
  colors: string[]
): Promise<HTMLCanvasElement> => {
  const labels = Object.keys(data);
  const values = Object.values(data);
  
  const config: ChartConfiguration = {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 3,
        borderColor: '#ffffff',
        hoverBorderWidth: 4,
        hoverBorderColor: '#ffffff'
      }]
    },
    options: {
      responsive: false,
      cutout: '60%',
      plugins: {
        title: {
          display: true,
          text: title,
          font: { size: 18, weight: 'bold' },
          color: '#1f2937',
          padding: 20
        },
        legend: {
          position: 'bottom',
          labels: { 
            font: { size: 12 },
            color: '#374151',
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 6,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed}h (${percentage}%)`;
            }
          }
        }
      }
    }
  };
  
  return createEnhancedCanvas(config);
};

// Convert canvas to image data for PDF
const canvasToImageData = (canvas: HTMLCanvasElement): string => {
  return canvas.toDataURL('image/png', 1.0);
};