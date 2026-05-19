import React, { useState, useEffect } from 'react';
import './LandingPage.css';
import LoginPage from './LoginPage';

import DoctorAccount from '../DoctorAccount/DoctorAccount';
import PatientAccount from '../PatientAccount/PatientAccount';
import AdminAccount from '../AdminAccount/AdminAccount';

import logo from '../../public/Logo-2.svg';
import heroImg from '../../public/dentist_photo.jpg';
import devlogo from '../../public/AO-preview.png';

const LandingPage = () => {
    const [view, setView] = useState('landing');
    const [activeSection, setActiveSection] = useState('home');
    const [user, setUser] = useState(null);
    const [loadingSession, setLoadingSession] = useState(true); // НОВЕ: Запобігає бліканню інтерфейсу при перевірці сесії

    const [currentSlide, setCurrentSlide] = useState(0);
    const [currentDoctorSlide, setCurrentDoctorSlide] = useState(0);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [availableServices, setAvailableServices] = useState([]);

    const [bookingData, setBookingData] = useState({
        patientName: '',
        patientPhone: '+38',
        serviceId: ''
    });

    // НОВЕ: Автоматична валідація сесії при оновленні сторінки (F5)
    useEffect(() => {
        const checkSession = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // Перевіряємо токен через захищений ендпоінт профілю на бекенді
                    const response = await fetch('http://localhost:5000/api/profile', {
                        method: 'GET',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (response.ok) {
                        const parsedUser = JSON.parse(savedUser);
                        setUser(parsedUser);
                        setView(parsedUser.role); // Наприклад: 'admin', 'doctor', 'patient'
                    } else {
                        // Якщо токен застарів або недійсний — чистимо сміття
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                    }
                } catch (error) {
                    console.error("Помилка відновлення сесії:", error);
                }
            }
            setLoadingSession(false);
        };

        checkSession();
    }, []);

    useEffect(() => {
        fetch('http://localhost:5000/api/services')
            .then(res => res.json())
            .then(data => setAvailableServices(data))
            .catch(err => console.error("Помилка завантаження послуг:", err));
    }, []);

    const handleLogin = (role, userData) => {
        setUser(userData);
        setView(role);
    };

    // ОНОВЛЕНО: Повний клінінг при логауті
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setView('landing');
    };

    const handleBookingSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('http://localhost:5000/api/patient/request-appointment', { // Фікс ендпоінту згідно з твоїм server.js
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bookingData)
            });

            if (response.ok) {
                alert('Дякуємо! Ваша заявка надіслана. Очікуйте на дзвінок адміністратора.');
                setBookingData({ patientName: '', patientPhone: '+38', serviceId: '' }); // Очищення форми відповідно до стейту
            } else {
                alert('Сталася помилка при відправці заявки.');
            }
        } catch (error) {
            alert('Сервер недоступний. Спробуйте пізніше.');
        }
    };

    const scrollToSection = (id) => {
        const element = document.getElementById(id);
        if (element) {
            window.scrollTo({ top: element.offsetTop - 75, behavior: 'smooth' });
        }
    };

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    useEffect(() => {
        const handleScroll = () => {
            setShowScrollTop(window.scrollY > 300);
            if (view !== 'landing') return;

            const sections = ['services', 'doctors', 'about', 'booking'];
            let currentActive = 'home';

            sections.forEach((id) => {
                const section = document.getElementById(id);
                if (section) {
                    const sectionTop = section.offsetTop - 100;
                    if (window.scrollY >= sectionTop) currentActive = id;
                }
            });
            setActiveSection(currentActive);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [view]);

    // Поки перевіряється сесія — показуємо легкий екран завантаження, щоб уникнути стрибків інтерфейсу
    if (loadingSession) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f4f7f6', fontFamily: "'Comfortaa', sans-serif" }}><h2>Синхронізація захищеного з'єднання...</h2></div>;
    }

    if (view === 'login') return <LoginPage onLogin={handleLogin} onBack={() => setView('landing')} />;
    if (view === 'doctor') return <DoctorAccount user={user} onLogout={handleLogout} />;
    if (view === 'patient') return <PatientAccount user={user} onLogout={handleLogout} />;
    if (view === 'admin') return <AdminAccount user={user} onLogout={handleLogout} />;

    const services = [
        { title: "Терапія", desc: "Лікування карієсу та каналів зуба.", img: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?q=80&w=600" },
        { title: "Ортодонтія", desc: "Виправлення прикусу (брекети, елайнери).", img: "https://sorridi.clinic/wp-content/uploads/2023/09/mainpage222-750x750.webp" },
        { title: "Професійна гігієна", desc: "Чистка Air Flow та ультразвук.", img: "https://images.unsplash.com/photo-1445527815219-ecbfec67492e?q=80&w=600" },
        { title: "Відбілювання", desc: "Безпечне освітлення емалі на 8 тонів.", img: "https://images.unsplash.com/photo-1468493858157-0da44aaf1d13?q=80&w=600" },
        { title: "Імплантація", desc: "Відновлення зубів за допомогою імплантів.", img: "https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?q=80&w=600" }
    ];

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % services.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev === 0 ? services.length - 1 : prev - 1));

    const doctors = [
        { name: "Д-р Олександр Оникс", specialty: "Стоматолог-терапевт", info: "Спеціаліст з лікування карієсу та ендодонтії.", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=600" },
        { name: "Д-р Олена Біла", specialty: "Ортодонт", info: "Експерт з виправлення прикусу та елайнерів.", img: "https://toothbudsdentistry.ca/srcjhvbsx/uploads/2025/03/Dr.Prabhdeep-Kaur-nobg-e1741167148936.png" },
        { name: "Д-р Ігор Чистий", specialty: "Гігієніст", info: "Майстер професійної чистки та профілактики.", img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=600" },
        { name: "Д-р Світлана Сяйво", specialty: "Естетист", info: "Спеціалізується на відбілуванні та вінірах.", img: "https://png.pngtree.com/png-vector/20250415/ourmid/pngtree-smiling-female-dentist-with-tooth-model-png-image_15962818.png" },
        { name: "Д-р Максим Міцний", specialty: "Хірург-імплантолог", info: "Встановлення імплантів будь-якої складності.", img: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=600" }
    ];

    const nextDoctor = () => setCurrentDoctorSlide((prev) => (prev + 1) % doctors.length);
    const prevDoctor = () => setCurrentDoctorSlide((prev) => (prev === 0 ? doctors.length - 1 : prev - 1));

    return (
        <div className="landing-container">
            <nav className="navbar">
                <div className="nav-content">
                    <div className="logo-container" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
                        <img src={logo} alt="OnyxDent Logo" className="logo-img" />
                    </div>
                    <ul className="nav-menu">
                        <li className={activeSection === 'services' ? 'active' : ''} onClick={() => scrollToSection('services')}>Послуги</li>
                        <li className={activeSection === 'doctors' ? 'active' : ''} onClick={() => scrollToSection('doctors')}>Лікарі</li>
                        <li className={activeSection === 'about' ? 'active' : ''} onClick={() => scrollToSection('about')}>Про нас</li>
                        <li className={activeSection === 'booking' ? 'active' : ''} onClick={() => scrollToSection('booking')}>Запис</li>
                    </ul>
                    <button className="cabinet-btn" onClick={() => setView('login')}>Кабінет</button>
                </div>
            </nav>

            <header id="home" className="hero-section">
                <div className="hero-content">
                    <div className="hero-text">
                        <h1>Турботлива стоматологія, де комфорт і здорова усмішка – на першому місці.</h1>
                        <button className="cta-button" onClick={() => scrollToSection('booking')}>Записатися на прийом</button>
                    </div>
                    <div className="hero-image-wrapper">
                        <div className="circle-image-container">
                            <img src={heroImg} alt="Dentist" className="hero-main-img" />
                        </div>
                    </div>
                </div>
            </header>

            <section id="services" className="services-section">
                <h2 className="section-title">Наші послуги</h2>
                <div className="carousel-container">
                    <button className="carousel-btn prev" onClick={prevSlide}>&#10094;</button>
                    <div className="carousel-track">
                        {services.map((service, index) => {
                            let position = "next-slide";
                            if (index === currentSlide) position = "active-slide";
                            else if (index === (currentSlide - 1 + services.length) % services.length) position = "prev-slide";
                            else if (index === (currentSlide + 1) % services.length) position = "next-slide";
                            else position = "hidden-slide";

                            return (
                                <div className={`service-card ${position}`} key={index}>
                                    <img src={service.img} alt={service.title} className="service-img" />
                                    <div className="service-info">
                                        <h3>{service.title}</h3>
                                        <p>{service.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button className="carousel-btn next" onClick={nextSlide}>&#10095;</button>
                </div>
            </section>

            <section id="doctors" className="doctors-section">
                <h2 className="section-title">Наші Лікарі</h2>
                <div className="carousel-container">
                    <button className="carousel-btn prev" onClick={prevDoctor}>&#10094;</button>
                    <div className="carousel-track">
                        {doctors.map((doctor, index) => {
                            let position = "hidden-slide";
                            if (index === currentDoctorSlide) position = "active-slide";
                            else if (index === (currentDoctorSlide - 1 + doctors.length) % doctors.length) position = "prev-slide";
                            else if (index === (currentDoctorSlide + 1) % doctors.length) position = "next-slide";

                            return (
                                <div className={`doctor-card ${position}`} key={index}>
                                    <img src={doctor.img} alt={doctor.name} className="doctor-img" />
                                    <div className="doctor-info">
                                        <h3>{doctor.name}</h3>
                                        <h4 className="doctor-spec">{doctor.specialty}</h4>
                                        <p>{doctor.info}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <button className="carousel-btn next" onClick={nextDoctor}>&#10095;</button>
                </div>
            </section>

            <section id="about" className="about-section">
                <div className="about-container">
                    <div className="about-image">
                        <img src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800" alt="Наша клініка" />
                        <div className="about-experience-badge">
                            <span>10+</span>
                            <p>років досвіду</p>
                        </div>
                    </div>
                    <div className="about-content">
                        <h2 className="section-title">Про клініку OnyxDent</h2>
                        <p className="about-text">
                            Ми створили OnyxDent як місце, де сучасні технології поєднуються з домашнім затишком.
                            Наше головне завдання — зробити ваш візит максимально комфортним та безболісним.
                        </p>
                        <div className="about-features">
                            <div className="feature-item"><span className="feature-icon">✔</span><p>Новітнє обладнання європейського зразка</p></div>
                            <div className="feature-item"><span className="feature-icon">✔</span><p>Команда експертів з багаторічним стажем</p></div>
                            <div className="feature-item"><span className="feature-icon">✔</span><p>Індивідуальний підхід до кожного пацієнта</p></div>
                        </div>
                    </div>
                </div>
            </section>

            <section id="booking" className="booking-section">
                <div className="booking-container">
                    <div className="booking-text-side">
                        <h2 className="booking-title">Записатися на прийом</h2>
                        <form className="booking-form" onSubmit={handleBookingSubmit}>
                            <input
                                type="text"
                                placeholder="Ваше ім'я"
                                className="form-input"
                                required
                                value={bookingData.patientName}
                                onChange={(e) => setBookingData({ ...bookingData, patientName: e.target.value })}
                            />
                            <div className="phone-input-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                <span style={{ position: 'absolute', left: '12px', color: '#666', fontWeight: 'bold' }}>+38</span>
                                <input
                                    type="tel"
                                    placeholder="0XX XXX XX XX"
                                    className="form-input"
                                    style={{ paddingLeft: '45px', width: '100%' }}
                                    required
                                    onChange={(e) => {
                                        let val = e.target.value.replace(/\D/g, '');
                                        if (val.startsWith('38')) val = val.substring(2);
                                        setBookingData({ ...bookingData, patientPhone: '+38' + val });
                                    }}
                                />
                            </div>
                            <select
                                className="form-input"
                                required
                                value={bookingData.serviceId}
                                onChange={(e) => setBookingData({ ...bookingData, serviceId: e.target.value })}
                            >
                                <option value="">Оберіть послугу</option>
                                {availableServices.map(service => (
                                    <option key={service.id} value={service.id}>{service.title}</option>
                                ))}
                            </select>
                            <button type="submit" className="form-submit-btn">Замовити дзвінок</button>
                        </form>
                    </div>
                </div>
            </section>

            <footer className="main-footer">
                <div className="footer-content">
                    <div className="footer-column"><h4>Контакти:</h4><p>+38 (0XX) XXX-XX-XX</p><p>info@onyxdent.com</p></div>
                    <div className="footer-column"><h4>Адреса:</h4><p>м. Черкаси,</p><p>вул. Центральна, 1</p></div>
                    <div className="footer-column"><h4>Ми в соц.мережах:</h4><div className="social-links"><p><span>Instagram</span></p><p><span>Facebook</span></p></div></div>
                </div>
                <div className="footer-bottom">
                    <p className="created-by"><img src={devlogo} alt="dev-logo" className="dev-mini-photo" /></p>
                </div>
            </footer>
            {showScrollTop && <button className="scroll-top-btn" onClick={scrollToTop}>&#8593;</button>}
        </div>
    );
};

export default LandingPage;