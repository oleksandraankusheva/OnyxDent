import React, { useState } from 'react';
import './PatientAccount.css';

// Імпорт компонентів вкладок
import PatientAppointments from './Tabs/PatientAppointments';
import PatientMedicalCard from './Tabs/PatientMedicalCard';
import PatientSettings from './Tabs/PatientSettings';
import Chat from '../Chat';

const PatientAccount = ({ user, onLogout }) => {
    const [activeTab, setActiveTab] = useState('appointments');
    const [selectedDoctor, setSelectedDoctor] = useState(null);

    const today = new Date().toLocaleDateString('uk-UA', {
        day: 'numeric', month: 'long', year: 'numeric', weekday: 'long'
    });
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
                            onSelectContact={(doc) => setSelectedDoctor(doc)} // Передача функції вибору[cite: 3]
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