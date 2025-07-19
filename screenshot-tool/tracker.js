// DOM Elements
const internshipTableContainer = document.getElementById('internshipTableContainer');
const statusFilter = document.getElementById('statusFilter');
const searchFilter = document.getElementById('searchFilter');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');
const addInternshipBtn = document.getElementById('addInternshipBtn');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const editId = document.getElementById('editId');
const editCompany = document.getElementById('editCompany');
const editTitle = document.getElementById('editTitle');
const editLocation = document.getElementById('editLocation');
const editStatus = document.getElementById('editStatus');
const editNotes = document.getElementById('editNotes');
const saveInternshipBtn = document.getElementById('saveInternshipBtn');
const modalCloseButtons = document.querySelectorAll('.modal-close');

// Current filters
let currentFilters = {
  status: 'all',
  search: ''
};

// Listen for internships updated
window.electron.onInternshipsUpdated(() => {
  loadInternships();
});

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  loadInternships();
  
  // Set up event listeners
  statusFilter.addEventListener('change', handleFilterChange);
  searchFilter.addEventListener('input', handleFilterChange);
  clearFiltersBtn.addEventListener('click', clearFilters);
  addInternshipBtn.addEventListener('click', () => openEditModal());
  saveInternshipBtn.addEventListener('click', saveInternship);
  
  // Close modal when clicking close buttons
  modalCloseButtons.forEach(button => {
    button.addEventListener('click', () => {
      editModal.style.display = 'none';
    });
  });
  
  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === editModal) {
      editModal.style.display = 'none';
    }
  });
});

// Load internships with filters
async function loadInternships() {
  try {
    internshipTableContainer.innerHTML = '<div class="loading">Loading internships...</div>';
    
    // Get internships
    const internships = await window.electron.getInternships();
    
    // Apply filters
    const filteredInternships = filterInternships(internships);
    
    // Render table
    renderInternshipTable(filteredInternships);
  } catch (error) {
    console.error('Error loading internships:', error);
    internshipTableContainer.innerHTML = `
      <div class="empty-state">
        <p>Error loading internships. Please try again.</p>
      </div>
    `;
  }
}

// Filter internships based on current filters
function filterInternships(internships) {
  return internships.filter(internship => {
    // Filter by status
    if (currentFilters.status !== 'all' && internship.status !== currentFilters.status) {
      return false;
    }
    
    // Filter by search
    if (currentFilters.search) {
      const searchLower = currentFilters.search.toLowerCase();
      const companyMatch = internship.companyName?.toLowerCase().includes(searchLower);
      const titleMatch = internship.jobTitle?.toLowerCase().includes(searchLower);
      const locationMatch = internship.location?.toLowerCase().includes(searchLower);
      
      if (!companyMatch && !titleMatch && !locationMatch) {
        return false;
      }
    }
    
    return true;
  });
}

// Render internship table
function renderInternshipTable(internships) {
  if (!internships || internships.length === 0) {
    internshipTableContainer.innerHTML = `
      <div class="empty-state">
        <p>No internships found. Add one to get started!</p>
      </div>
    `;
    return;
  }
  
  // Create table
  const table = document.createElement('table');
  table.className = 'internship-table';
  
  // Create header
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Company</th>
      <th>Position</th>
      <th>Location</th>
      <th>Status</th>
      <th>Added</th>
      <th>Actions</th>
    </tr>
  `;
  table.appendChild(thead);
  
  // Create body
  const tbody = document.createElement('tbody');
  
  internships.forEach(internship => {
    const tr = document.createElement('tr');
    
    // Format date
    const addedDate = new Date(internship.addedAt || new Date());
    const formattedDate = addedDate.toLocaleDateString();
    
    tr.innerHTML = `
      <td>${internship.companyName || 'Unknown'}</td>
      <td>${internship.jobTitle || 'Unknown'}</td>
      <td>${internship.location || 'Not specified'}</td>
      <td>
        <span class="status-badge status-${internship.status || 'interested'}">
          ${internship.status || 'Interested'}
        </span>
      </td>
      <td>${formattedDate}</td>
      <td class="actions">
        <button class="action-btn edit-btn" data-id="${internship.id}">Edit</button>
        <button class="action-btn danger delete-btn" data-id="${internship.id}">Delete</button>
      </td>
    `;
    
    // Add event listeners
    const editBtn = tr.querySelector('.edit-btn');
    const deleteBtn = tr.querySelector('.delete-btn');
    
    editBtn.addEventListener('click', () => openEditModal(internship));
    deleteBtn.addEventListener('click', () => deleteInternship(internship.id));
    
    tbody.appendChild(tr);
  });
  
  table.appendChild(tbody);
  
  // Add table to container
  internshipTableContainer.innerHTML = '';
  internshipTableContainer.appendChild(table);
}

// Handle filter change
function handleFilterChange() {
  currentFilters = {
    status: statusFilter.value,
    search: searchFilter.value
  };
  
  loadInternships();
}

// Clear filters
function clearFilters() {
  statusFilter.value = 'all';
  searchFilter.value = '';
  
  currentFilters = {
    status: 'all',
    search: ''
  };
  
  loadInternships();
}

// Open edit modal
function openEditModal(internship = null) {
  // Clear form
  editForm.reset();
  
  if (internship) {
    // Edit mode
    editId.value = internship.id;
    editCompany.value = internship.companyName || '';
    editTitle.value = internship.jobTitle || '';
    editLocation.value = internship.location || '';
    editStatus.value = internship.status || 'interested';
    editNotes.value = internship.notes || '';
    
    document.querySelector('.modal-title').textContent = 'Edit Internship';
  } else {
    // Add mode
    editId.value = '';
    editStatus.value = 'interested';
    
    document.querySelector('.modal-title').textContent = 'Add Internship';
  }
  
  // Show modal
  editModal.style.display = 'flex';
}

// Save internship
async function saveInternship() {
  try {
    // Validate form
    if (!editCompany.value || !editTitle.value) {
      alert('Please enter company name and position');
      return;
    }
    
    const internshipData = {
      companyName: editCompany.value,
      jobTitle: editTitle.value,
      location: editLocation.value,
      status: editStatus.value,
      notes: editNotes.value
    };
    
    if (editId.value) {
      // Update existing internship
      await window.electron.updateInternship(editId.value, internshipData);
    } else {
      // Add new internship
      await window.electron.addInternship(internshipData);
    }
    
    // Close modal and reload
    editModal.style.display = 'none';
    loadInternships();
  } catch (error) {
    console.error('Error saving internship:', error);
    alert('Failed to save internship');
  }
}

// Delete internship
async function deleteInternship(id) {
  try {
    const confirmed = confirm('Are you sure you want to delete this internship?');
    
    if (confirmed) {
      await window.electron.deleteInternship(id);
      loadInternships();
    }
  } catch (error) {
    console.error('Error deleting internship:', error);
    alert('Failed to delete internship');
  }
} 