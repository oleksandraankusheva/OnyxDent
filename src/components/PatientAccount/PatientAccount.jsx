import React, { useState, useEffect } from 'react';
import './PatientAccount.css';

// Імпорт компонентів вкладок
import PatientAppointments from './Tabs/PatientAppointments';
import PatientMedicalCard from './Tabs/PatientMedicalCard';
import PatientSettings from './Tabs/PatientSettings';
import Chat from '../Chat';

const PatientAccount = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('appointments');
    const [selectedDoctor, setSelectedDoctor] = useState(null);
    
    // Стейт для відображення попередження про тимчасовий пароль
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);

    const today = new Date().toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
    });

    // Перевірка типу пароля при першому рендері кабінету
    useEffect(() => {
        if (user && user.isTemporaryPassword) {
            setShowSecurityWarning(true);
        }
    }, [user]);

    console.log("Дані авторизованого користувача в кабінеті:", user);

    return (
        <div className="patient-dashboard">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h3>OnyxDent</h3>
                    <p>Кабінет пацієнта</p>
                </div>
                <nav className="sidebar-nav">
                    <ul>
                        <li className={activeTab === 'appointments' ? 'active' : ''}
                            onClick={() => setActiveTab('appointments')}>Мої візити</li>
                        <li className={activeTab === 'medical' ? 'active' : ''}
                            onClick={() => setActiveTab('medical')}>Медична карта</li>
                        <li className={activeTab === 'messages' ? 'active' : ''}
                            onClick={() => setActiveTab('messages')}>Повідомлення</li>
                        <li className={activeTab === 'settings' ? 'active' : ''}
                            onClick={() => setActiveTab('settings')}>Налаштування</li>
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
                    {/* СИСТЕМНИЙ БАНЕР-ЗАСТЕРЕЖЕННЯ ПРО БЕЗПЕКУ */}
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
                                <strong>🚨 Тимчасовий пароль!</strong> Ви використовуєте початковий пароль, згенерований системою OnyxDent. Будь ласка, змініть його задля безпеки ваших особистих та медичних даних.
                            </div>
                            <button 
                                onClick={() => {
                                    setActiveTab('settings'); // Автоматично перенаправляємо на вкладку налаштувань
                                    setShowSecurityWarning(false); // Приховуємо банер
                                }}
                                style={{
                                    background: '#2ecc71',
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
                                onMouseEnter={(e) => e.target.style.background = '#27ae60'}
                                onMouseLeave={(e) => e.target.style.background = '#2ecc71'}
                            >
                                Змінити зараз
                            </button>
                        </div>
                    )}

                    {activeTab === 'appointments' && <PatientAppointments 
                        userId={user.id} 
                        userName={user.name || user.full_name} 
                        userPhone={user.phone || user.phone_number || user.patient_phone || user.user_phone}
                    />}
                    {activeTab === 'medical' && <PatientMedicalCard userId={user.id} />}
                    {activeTab === 'messages' && (
                        <Chat
                            currentUser={user}
                            chatWith={selectedDoctor}
                            onSelectContact={(doc) => setSelectedDoctor(doc)}
                            onBack={() => setSelectedDoctor(null)}
                            userRole="patient"
                        />
                    )}
                    {activeTab === 'settings' && <PatientSettings userId={user.id} />}
                </div>
            </main>
        </div>
    );
};

export default PatientAccount;