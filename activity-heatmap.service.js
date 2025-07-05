// activity-heatmap.service.js - Activity heatmap functionality

/**
 * Generates an activity heatmap showing study activity over the past year
 * Similar to GitHub's contribution graph
 */
export function generateActivityHeatmap() {
  const heatmapContainer = document.getElementById('activity-heatmap');
  if (!heatmapContainer) return;
  
  const weeks = 52;
  const days = 7;
  let html = '';
  
  // Generate heatmap for the past year
  for (let week = 0; week < weeks; week++) {
    html += '<div class="heatmap-week">';
    for (let day = 0; day < days; day++) {
      // Generate random activity level (0-4) for demo
      // In a real app, this would come from actual user data
      const activity = Math.floor(Math.random() * 5);
      const date = new Date();
      date.setDate(date.getDate() - (weeks - week) * 7 + day);
      
      html += `<div class="heatmap-day activity-${activity}" 
                    title="${date.toDateString()} - ${activity} cards studied"
                    data-activity="${activity}"
                    data-date="${date.toISOString().split('T')[0]}">
               </div>`;
    }
    html += '</div>';
  }
  
  heatmapContainer.innerHTML = html;
  
  // Add hover effects and tooltips
  addHeatmapInteractivity();
}

/**
 * Adds interactive features to the heatmap
 */
function addHeatmapInteractivity() {
  const heatmapDays = document.querySelectorAll('.heatmap-day');
  
  heatmapDays.forEach(day => {
    day.addEventListener('mouseenter', (e) => {
      const activity = e.target.getAttribute('data-activity');
      const date = e.target.getAttribute('data-date');
      
      // Create tooltip (simple implementation)
      const tooltip = document.createElement('div');
      tooltip.className = 'heatmap-tooltip';
      tooltip.innerHTML = `
        <strong>${new Date(date).toLocaleDateString()}</strong><br>
        ${activity} cards studied
      `;
      
      document.body.appendChild(tooltip);
      
      // Position tooltip
      const rect = e.target.getBoundingClientRect();
      tooltip.style.left = rect.left + rect.width / 2 + 'px';
      tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';
    });
    
    day.addEventListener('mouseleave', () => {
      const tooltip = document.querySelector('.heatmap-tooltip');
      if (tooltip) {
        tooltip.remove();
      }
    });
  });
}

/**
 * Updates heatmap with real activity data
 * @param {Array} activityData - Array of {date, count} objects
 */
export function updateHeatmapWithData(activityData) {
  const heatmapContainer = document.getElementById('activity-heatmap');
  if (!heatmapContainer) return;
  
  // Create a map for quick lookup
  const activityMap = new Map();
  activityData.forEach(item => {
    activityMap.set(item.date, item.count);
  });
  
  const weeks = 52;
  const days = 7;
  let html = '';
  
  for (let week = 0; week < weeks; week++) {
    html += '<div class="heatmap-week">';
    for (let day = 0; day < days; day++) {
      const date = new Date();
      date.setDate(date.getDate() - (weeks - week) * 7 + day);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get actual activity count or default to 0
      const count = activityMap.get(dateStr) || 0;
      
      // Convert count to activity level (0-4)
      let activity = 0;
      if (count > 0) activity = 1;
      if (count > 5) activity = 2;
      if (count > 10) activity = 3;
      if (count > 20) activity = 4;
      
      html += `<div class="heatmap-day activity-${activity}" 
                    title="${date.toDateString()} - ${count} cards studied"
                    data-activity="${activity}"
                    data-date="${dateStr}"
                    data-count="${count}">
               </div>`;
    }
    html += '</div>';
  }
  
  heatmapContainer.innerHTML = html;
  addHeatmapInteractivity();
}

// Initialize heatmap when DOM is ready
export function initializeActivityHeatmap() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', generateActivityHeatmap);
  } else {
    generateActivityHeatmap();
  }
}

// Expose to global scope for compatibility
window.generateActivityHeatmap = generateActivityHeatmap;
window.updateHeatmapWithData = updateHeatmapWithData;

