const API_BASE_URL = 'http://localhost:5500/api';

// DOM Elements
const applicationForm = document.getElementById('applicationForm');
const successModal = document.getElementById('successModal');
const errorModal = document.getElementById('errorModal');
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

let selectedFiles = [];
let selectedSchedule = {};
let allGalleryImages = [];
let currentCarouselIndex = 0;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadTeachers();
    loadGallery();
    setupStudySchedule();
});


// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    hamburger.addEventListener('click', toggleMenu);
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Form
    applicationForm.addEventListener('submit', handleFormSubmit);

    // Modal Close
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Modal Click Outside
    window.addEventListener('click', (e) => {
        if (e.target === successModal || e.target === errorModal) {
            closeModals();
        }
    });

    // Gallery Carousel Modal Click Outside
    const carouselModal = document.getElementById('galleryCarouselModal');
    if (carouselModal) {
        carouselModal.addEventListener('click', (e) => {
            if (e.target === carouselModal || e.target.closest('.carousel-background')) {
                closeGalleryCarousel();
            }
        });
    }

    // Initialize Event Modal
    initEventModal();
}

// Navigation Toggle
function toggleMenu() {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
}

function closeMenu() {
    navMenu.classList.remove('active');
    hamburger.classList.remove('active');
}

// Scroll to form with program selection
function scrollToForm(program) {
    document.getElementById('programType').value = program;
    updateDesiredPrograms();
    document.getElementById('apply').scrollIntoView({ behavior: 'smooth' });
}

// Update desired programs based on program type
function updateDesiredPrograms() {
    const programType = document.getElementById('programType').value;
    const desiredProgram = document.getElementById('desiredProgram');

    const programs = {
        basic: ['Web Development', 'Data Science', 'UI/UX Design', 'Business Basics'],
        scholar: ['Advanced AI', 'Blockchain Technology', 'Cloud Architecture', 'Leadership Program']
    };

    desiredProgram.innerHTML = '<option value="">Select Program Track</option>';

    if (programType && programs[programType]) {
        programs[programType].forEach(program => {
            const option = document.createElement('option');
            option.value = program;
            option.textContent = program;
            desiredProgram.appendChild(option);
        });
    }
}

// Study Schedule Setup
function setupStudySchedule() {
    const days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
    const calendar = document.getElementById('scheduleCalendar');
    
    const scheduleGrid = document.createElement('div');
    scheduleGrid.className = 'schedule-grid';
    
    days.forEach(day => {
        const dayCard = document.createElement('div');
        dayCard.className = 'day-card';
        dayCard.innerHTML = `
            <h4>${day}</h4>
            <div class="time-slots">
                <button class="time-slot" onclick="toggleTimeSlot('${day}', 'morning')">Matin<br><small>8h - 10h</small></button>
                <button class="time-slot" onclick="toggleTimeSlot('${day}', 'morning')">Matin<br><small>10h - 12h</small></button>
                <button class="time-slot" onclick="toggleTimeSlot('${day}', 'afternoon')">Après-midi<br><small>13h - 15h</small></button>
                <button class="time-slot" onclick="toggleTimeSlot('${day}', 'lateAfternoon')">Après-midi<br><small>15h - 17h</small></button>
            </div>
        `;
        scheduleGrid.appendChild(dayCard);
        
        // Initialize schedule object
        selectedSchedule[day] = { morning: false, afternoon: false };
    });
    
    calendar.appendChild(scheduleGrid);
    updateScheduleDisplay();
}

function toggleTimeSlot(day, period) {
    if (!selectedSchedule[day]) {
        selectedSchedule[day] = {};
    }
    selectedSchedule[day][period] = !selectedSchedule[day][period];
    
    // Update button styling
    const button = event.target.closest('.time-slot');
    button.classList.toggle('active');
    
    updateScheduleDisplay();
}

function updateScheduleDisplay() {
    const selectedDiv = document.getElementById('selectedSchedule');
    let selected = [];
    
    Object.keys(selectedSchedule).forEach(day => {
        Object.keys(selectedSchedule[day]).forEach(period => {
            if (selectedSchedule[day][period]) {
                const periodName = period === 'morning' ? 'Matin' : 'Après-midi';
                selected.push(`${day} - ${periodName}`);
            }
        });
    });
    
    if (selected.length > 0) {
        selectedDiv.innerHTML = `<div class="selected-times"><strong>Créneaux sélectionnés:</strong> ${selected.join(', ')}</div>`;
    } else {
        selectedDiv.innerHTML = '<div class="selected-times" style="color: var(--text-light);">Aucun créneau sélectionné pour le moment</div>';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Form Submission
async function handleFormSubmit(e) {
    e.preventDefault();

    // Validate form
    if (!applicationForm.checkValidity()) {
        showError('Please fill in all required fields');
        return;
    }

    // Create FormData
    const formData = new FormData();
    
    // Add form fields
    const formFields = [
        'firstName', 'lastName', 'email', 'phone',
        'currentEducation', 'school', 'major', 'gpa',
        'programType', 'desiredProgram', 'motivation', 'achievements'
    ];

    formFields.forEach(field => {
        const value = document.getElementById(field).value;
        if (value) {
            formData.append(field, value);
        }
    });

    // Add study schedule
    formData.append('studySchedule', JSON.stringify(selectedSchedule));

    // Submit
    try {
        const button = applicationForm.querySelector('.submit-btn');
        button.disabled = true;
        button.innerHTML = '<span class="spinner"></span> Submitting...';

        const response = await fetch(`${API_BASE_URL}/submissions`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || error.errors?.[0]?.msg || 'Submission failed');
        }

        const data = await response.json();
        showSuccess(data.submissionId);
        applicationForm.reset();
        selectedFiles = [];
        fileList.innerHTML = '';

    } catch (error) {
        console.error('Error:', error);
        showError(error.message);
    } finally {
        const button = applicationForm.querySelector('.submit-btn');
        button.disabled = false;
        button.innerHTML = 'Submit Application';
    }
}

// Load Teachers
async function loadTeachers() {
    try {
        const response = await fetch(`${API_BASE_URL}/teachers?isActive=true`);
        const teachers = await response.json();

        const teachersGrid = document.getElementById('teachersGrid');
        
        if (teachers.length === 0) {
            teachersGrid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                    <p style="color: var(--text-light);">Faculty information coming soon...</p>
                </div>
            `;
            return;
        }

        teachersGrid.innerHTML = teachers.map(teacher => `
            <div class="teacher-card">
                <div class="teacher-image ${!teacher.image ? 'placeholder' : ''}">
                    ${teacher.image 
                        ? `<img src="${API_BASE_URL.replace('/api', '')}/uploads/${teacher.image.filename}" alt="${teacher.name}">` 
                        : '<i class="fas fa-user"></i>'
                    }
                </div>
                <div class="teacher-info">
                    <div class="teacher-name">${teacher.name}</div>
                    <div class="teacher-role">${teacher.role}</div>
                    <div class="teacher-specialty">${teacher.specialty}</div>
                    ${teacher.bio ? `<div class="teacher-bio">${teacher.bio.substring(0, 100)}...</div>` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
       // console.error('Error loading teachers:', error);
    }
}

// Load Gallery
async function loadGallery() {
    try {
        const response = await fetch(`${API_BASE_URL}/gallery?isActive=true`);
        const images = await response.json();

        displayGallery(images);

    } catch (error) {
        //console.error('Error loading gallery:', error);
    }
}

function displayGallery(images) {
    const galleryGrid = document.getElementById('galleryGrid');
    allGalleryImages = images;

    if (images.length === 0) {
        galleryGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
                <p style="color: var(--text-light);">p</p>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = images.map((img, index) => `
        <div class="gallery-item" data-category="${img.category}" onclick="openGalleryCarousel(${index})">
            <div class="gallery-image">
                ${img.image 
                    ? `<img src="${API_BASE_URL.replace('/api', '')}/uploads/${img.image.filename}" alt="${img.title}">` 
                    : `<i class="fas fa-image"></i>`
                }
            </div>
        </div>
    `).join('');
}

function filterGallery(category) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter items
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        if (category === 'all' || item.dataset.category === category) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}



// Modal Functions
function showSuccess(submissionId) {
    document.getElementById('submissionId').textContent = submissionId;
    successModal.style.display = 'block';
}

function showError(message) {
    document.getElementById('errorMessage').textContent = message;
    errorModal.style.display = 'block';
}

function closeErrorModal() {
    errorModal.style.display = 'none';
}

function closeModals() {
    successModal.style.display = 'none';
    errorModal.style.display = 'none';
}

// Smooth Scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });

    // Initialize Slider
    initSlider();
});

// Image Slider Function
function initSlider() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const sliderDeck = document.getElementById('sliderDeck');
    const currentPageSpan = document.getElementById('currentPage');
    
    let currentIndex = 0;
    const totalCards = document.querySelectorAll('.slider-card').length;

    function updateSlider() {
        const cards = document.querySelectorAll('.slider-card');
        cards.forEach((card, index) => {
            card.classList.remove('active', 'prev');
            
            if (index === currentIndex) {
                card.classList.add('active');
            } else if (index === (currentIndex - 1 + totalCards) % totalCards) {
                card.classList.add('prev');
            }
        });

        currentPageSpan.textContent = currentIndex + 1;
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalCards;
        updateSlider();
    }

    function prevSlide() {
        currentIndex = (currentIndex - 1 + totalCards) % totalCards;
        updateSlider();
    }

    nextBtn.addEventListener('click', nextSlide);
    prevBtn.addEventListener('click', prevSlide);

    // Initialize first slide
    updateSlider();
}

// Event Modal Functions
function initEventModal() {
    const eventTabBtn = document.getElementById('eventTabBtn');
    const eventModal = document.getElementById('eventModal');
    const eventClose = document.getElementById('eventClose');
    const eventForm = document.getElementById('eventForm');
    const eventSuccessModal = document.getElementById('eventSuccessModal');

    if (!eventForm) {
        console.warn('Event form not found');
        return;
    }

    // Open event modal
    if (eventTabBtn) {
        eventTabBtn.addEventListener('click', () => {
            eventModal.style.display = 'block';
        });
    }

    // Close event modal
    if (eventClose) {
        eventClose.addEventListener('click', () => {
            eventModal.style.display = 'none';
        });
    }

    // Close on outside click
    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) {
                eventModal.style.display = 'none';
            }
        });
    }

    // Handle event form submission
    eventForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = eventForm.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Envoi en cours...';
        }

        const formData = {
            nom: document.getElementById('eventNom').value,
            prenom: document.getElementById('eventPrenom').value,
            filiere: document.getElementById('eventFiliere').value,
            etablissement: document.getElementById('eventEtablissement').value,
            niveau: document.getElementById('eventNiveau').value,
            date_inscription: new Date().toLocaleString('fr-FR')
        };

        try {
            const response = await fetch('https://script.google.com/macros/s/AKfycbyoqp1iiLaH7WtQnIOHEjzvvSUW4PXd2CiVrvyZbH3ViuJZ1FrFbjxN2rDwSOOXXuxx/exec', {
                method: 'POST',
                mode: 'cors', 
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok || response.status === 0) {
                eventModal.style.display = 'none';
                eventSuccessModal.style.display = 'block';
                eventForm.reset();

                // Auto close success modal after 3 seconds
                setTimeout(() => {
                    eventSuccessModal.style.display = 'none';
                }, 3000);
            } else {
                throw new Error('Réponse serveur incorrecte');
            }

        } catch (err) {
            console.error('Erreur fetch:', err);
            // Les données sont peut-être quand même parties malgré l'erreur CORS
            eventModal.style.display = 'none';
            eventSuccessModal.style.display = 'block';
            eventForm.reset();

            setTimeout(() => {
                eventSuccessModal.style.display = 'none';
            }, 3000);
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'S\'inscrire à l\'événement';
            }
        }
    });
}

function closeEventSuccessModal() {
    document.getElementById('eventSuccessModal').style.display = 'none';
}

