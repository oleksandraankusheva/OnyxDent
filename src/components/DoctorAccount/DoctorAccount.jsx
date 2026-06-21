import React, { useState, useEffect } from 'react';
import './DoctorAccount.css';

// Імпорт компонентів вкладок
import AppointmentsList from './Tabs/AppointmentsList';
import CalendarView from './Tabs/CalendarView';
import PatientsList from './Tabs/PatientsList';
import SettingsTab from './Tabs/SettingsTab';
import Chat from '../Chat';
import AppointmentModal from '../AppointmentModal';

const DoctorAccount = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('list');
    const [selectedChat, setSelectedChat] = useState(null); 
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); 
    
    // Стейт для відображення попередження про тимчасовий пароль лікаря
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);
    
    const [services, setServices] = useState([]);

    const [formData, setFormData] = useState({
        isNewPatient: false,
        patientPhone: '',
        patientName: '',
        doctorId: user.id, 
        serviceId: '', 
        date: ''
    });

    const today = new Date().toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
    });

    // Перевірка безпеки облікового запису при завантаженні панелі
    useEffect(() => {
        if (user && user.isTemporaryPassword) {
            setShowSecurityWarning(true);
        }
    }, [user]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:5000/api/services', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setServices(data);
                    if (data.length > 0) {
                        setFormData(prev => ({ ...prev, serviceId: data[0].id.toString() }));
                    }
                }
            })
            .catch(err => console.error("Помилка завантаження послуг у лікаря:", err));
    }, []);

    const handleAddAppointment = async (e) => {
        e.preventDefault();
        const autoPassword = Math.random().toString(36).slice(-8);
        const token = localStorage.getItem('token');

        const response = await fetch('http://localhost:5000/api/doctor/add-appointment', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ...formData, autoPassword })
        });

        if (response.ok) {
            alert("Запис успешно створено!");
            setShowModal(false);
            window.location.reload();
        } else {
            const err = await response.json();
            alert(err.message);
        }
    };

    const handleViewAppointment = (app) => {
        setModalMode('view');
        setFormData({
            isNewPatient: false,
            patientPhone: app.patient_phone || '',
            patientName: app.patient_name || 'Зареєстрований клієнт',
            doctorId: user.id,
            serviceId: app.service_id ? app.service_id.toString() : '',
            date: app.appointment_date
        });
        setShowModal(true);
    };

    const handleSelectTimeSlot = (selectedTime) => {
        setModalMode('create');
        setFormData({
            isNewPatient: false,
            patientPhone: '',
            patientName: '',
            doctorId: user.id,
            serviceId: services.length > 0 ? services[0].id.toString() : '1',
            date: selectedTime
        });
        setShowModal(true);
    };

    return (
        <div className="doctor-dashboard">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h3>OnyxDent</h3>
                    <p>Панель лікаря</p>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li className={activeTab === 'list' ? 'active' : ''} onClick={() => setActiveTab('list')}>Записи</li>
                        <li className={activeTab === 'calendar' ? 'active' : ''} onClick={() => setActiveTab('calendar')}>Календар</li>
                        <li className={activeTab === 'patients' ? 'active' : ''} onClick={() => setActiveTab('patients')}>Пацієнти</li>
                        <li className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>Повідомлення</li>
                        <li className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Налаштування</li>
                    </ul>
                </nav>
                <button className="logout-btn" onClick={onLogout}>Вийти</button>
            </aside>

            <main className="dashboard-content">
                <header className="content-header">
                    <h1>Вітаємо, {user.name}!</h1>
                    <p className="current-date">{today}</p>
                </header>

                <div className="tab-container">
                    {/* КІБЕРБЕЗПЕКА: БАНЕР-ЗАСТЕРЕЖЕННЯ ПРО НЕОБХІДНІСТЬ ЗМІНИ ТИМЧАСОВОГО ПАРОЛЯ */}
                    {showSecurityWarning && (
                        <div style={{
                            background: '#fff3cd',
                            color: '#856404',
                            padding: '15px 20px',
                            borderRadius: '12px',
                            marginBottom: '20px',
                            border: '1px solid #ffeeba',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 4px 6px rgba(0,0,0,0.05)',
                            fontFamily: 'inherit'
                        }}>
                            <div style={{ fontSize: '0.95rem', lineHeight: '1.4' }}>
                                <strong>🚨 Режим безпеки:</strong> Ви увійшли під тимчасовим паролем персоналу OnyxDent. Оновіть пароль на вкладці налаштувань, щоб захистити персональну медичну систему від несанкціонованого доступу.
                            </div>
                            <button 
                                onClick={() => {
                                    setActiveTab('settings'); // Перемикаємо вкладку на налаштування
                                    setShowSecurityWarning(false);
                                }}
                                style={{
                                    background: '#e74c3c',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 15px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    marginLeft: '15px',
                                    whiteSpace: 'nowrap',
                                    transition: 'background 0.2s'
                                }}
                            >
                                Налаштувати
                            </button>
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <AppointmentsList 
                            doctorId={user.id} 
                            onEventSelect={handleViewAppointment} 
                        />
                    )}
                    {activeTab === 'calendar' && (
                        <CalendarView
                            doctorId={user.id}
                            onTimeSelect={handleSelectTimeSlot}       
                            onEventSelect={handleViewAppointment}    
                        />
                    )}
                    {activeTab === 'patients' && <PatientsList doctorId={user.id} onOpenChat={(p) => {
                        setSelectedChat(p);
                        setActiveTab('messages');
                    }} />}
                    {activeTab === 'messages' && (
                        <Chat
                            currentUser={user}
                            chatWith={selectedChat}
                            onSelectContact={(contact) => setSelectedChat(contact)}
                            onBack={() => setSelectedChat(null)}
                            userRole="doctor"
                        />
                    )}
                    {activeTab === 'settings' && <SettingsTab userId={user.id} />}
                </div>
            </main>

            <AppointmentModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSubmit={handleAddAppointment}
                formData={formData}             
                setFormData={setFormData}       
                doctors={[]}                    
                services={services} 
                mode={modalMode} 
                userRole="doctor"               
                onOpenMedicalCard={(appointment) => {
                    setShowModal(false);
                    setActiveTab('patients');
                }}
            />
        </div>
    );
};

export default DoctorAccount;