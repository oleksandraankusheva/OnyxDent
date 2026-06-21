import React, { useState, useEffect, useRef } from 'react';
import './AdminAccount.css';
import DoctorManagement from './Tabs/DoctorManagement';
import ServiceList from './Tabs/ServiceList';
import Statistics from './Tabs/Statistics';
import AppointmentModal from '../AppointmentModal';
import ClinicSchedule from './Tabs/ClinicSchedule';
import SystemRequestsTab from './Tabs/SystemRequestsTab';

const AdminAccount = ({ user, onLogout }) => {
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
    const [statusMsg, setStatusMsg] = useState({ text: '', type: '' });
    const [appointments, setAppointments] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [services, setServices] = useState([]);
    const [activeTab, setActiveTab] = useState('appointments');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isAddingAdmin, setIsAddingAdmin] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ fullName: '', phone: '+380' });
    
    // Стейт для банера безпеки (тимчасовий пароль)
    const [showSecurityWarning, setShowSecurityWarning] = useState(false);

    // ОНОВЛЕНО: Стейт для зміни пароля у вигляді об'єкта, як у пацієнта
    const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '' });
    const [passwordMessage, setPasswordMessage] = useState('');

    const [formData, setFormData] = useState({
        isNewPatient: false,
        patientPhone: '',
        patientName: '',
        doctorId: '',
        serviceId: '',
        date: '',
        requestId: null,
        isFromSite: false 
    });

    useEffect(() => {
        fetchAppointments();
        fetchDoctors();
        fetchServices();
        
        // Перевірка, чи поточний адмін сидить на системному паролі
        if (user && user.isTemporaryPassword) {
            setShowSecurityWarning(true);
        }
    }, [user]);

    // ОНОВЛЕНО: Функція обробки зміни пароля з використанням об'єкта passwordData
    const handlePasswordChange = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/user/change-password', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    userId: user.id, 
                    oldPassword: passwordData.oldPassword, 
                    newPassword: passwordData.newPassword 
                })
            });
            const data = await response.json();
            setPasswordMessage(data.message);
            if (response.ok) { 
                setPasswordData({ oldPassword: '', newPassword: '' }); // Очищення форми
                setShowSecurityWarning(false);
            }
        } catch (err) {
            setPasswordMessage("Помилка з'єднання з сервером");
        }
    };

    const handleAddAdminSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/add-admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newAdmin)
            });
            const data = await res.json();
            if (res.ok) {
                setStatusMsg({ text: `Адміністратора успішно додано! Тимчасовий пароль: ${data.temporaryPassword}`, type: 'success' });
                setIsAddingAdmin(false);
                setNewAdmin({ fullName: '', phone: '+380' });
            } else {
                setStatusMsg({ text: data.message || "Помилка створення", type: 'error' });
            }
        } catch (err) {
            setStatusMsg({ text: "Помилка з'єднання з сервером", type: 'error' });
        }
    };

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/admin/appointments', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (response.ok && Array.isArray(data)) setAppointments(data);
        } catch (error) {
            console.error("Помилка завантаження візитів:", error);
        }
    };

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/admin/doctors', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok && Array.isArray(data)) setDoctors(data);
        } catch (err) { console.error(err); }
    };

    const fetchServices = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/services');
            const data = await res.json();
            if (Array.isArray(data)) setServices(data);
        } catch (err) { console.error(err); }
    };

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setSelectedAppointmentId(null);
        setFormData({
            isNewPatient: false,
            patientPhone: '',
            patientName: '',
            doctorId: '',
            serviceId: services.length > 0 ? services[0].id.toString() : '',
            date: '',
            requestId: null,
            isFromSite: false
        });
        setShowModal(true);
    };

    const handleResetPassword = async (userId, patientPhone) => {
        if (window.confirm(`Скинути пароль для пацієнта ${patientPhone}?`)) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('http://localhost:5000/api/admin/reset-password', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ userId, patientPhone })
                });
                const data = await response.json();
                if (response.ok) {
                    setStatusMsg({ text: `Пароль скинуто! Новий тимчасовий: ${data.newTempPassword}`, type: 'success' });
                }
            } catch (error) { setStatusMsg({ text: "Помилка", type: 'error' }); }
        }
    };

    const handleAddVisit = async (e) => {
        e.preventDefault();
        const autoPassword = Math.random().toString(36).slice(-8);
        try {
            const token = localStorage.getItem('token');
            const endpoint = formData.isFromSite
                ? 'http://localhost:5000/api/admin/add-visit' 
                : 'http://localhost:5000/api/admin/add-visit';

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ...formData, autoPassword })
            });

            if (response.ok) {
                setStatusMsg({ text: "Візит успішно підтверджено та створено!", type: 'success' });
                setShowModal(false);
                fetchAppointments();
            } else {
                const error = await response.json();
                alert(error.message || "Помилка збереження");
            }
        } catch (error) {
            setStatusMsg({ text: "Помилка з'єднання", type: 'error' });
        }
    };

    const handleProcessRequest = (request, isSiteRequest = false) => {
        setModalMode('create');
        setFormData({
            isNewPatient: isSiteRequest ? true : false,
            patientPhone: request.patient_phone,
            patientName: request.patient_name,
            doctorId: '',
            serviceId: request.service_id ? request.service_id.toString() : (services.length > 0 ? services[0].id.toString() : ''),
            date: '',
            requestId: request.id,
            isFromSite: isSiteRequest
        });
        setShowModal(true);
    };

    const handleViewAppointment = (appointment) => {
        setModalMode('view');
        setSelectedAppointmentId(appointment.id);
        setFormData({
            isNewPatient: false,
            patientPhone: appointment.patient_phone || '',
            patientName: appointment.patient_name || '',
            doctorId: appointment.doctor_id ? appointment.doctor_id.toString() : '',
            serviceId: appointment.service_id ? appointment.service_id.toString() : '',
            date: appointment.appointment_date ? appointment.appointment_date.substring(0, 16) : '',
            requestId: null,
            isFromSite: false
        });
        setShowModal(true);
    };

    const handleCancelAppointment = async () => {
        if (!selectedAppointmentId) return;
        if (window.confirm(`Ви впевнені, що хочете скасувати прийом пацієнта ${formData.patientName}?`)) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`http://localhost:5000/api/admin/appointments/${selectedAppointmentId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    setStatusMsg({ text: "Прийом успішно скасовано!", type: 'success' });
                    setShowModal(false);
                    fetchAppointments();
                } else {
                    alert("Не вдалося скасувати прийом");
                }
            } catch (error) {
                console.error("Помилка видалення:", error);
            }
        }
    };

    const handleSelfDelete = async (e) => {
        e.preventDefault();
        if (!window.confirm("Ви впевнені, що хочете НАЗАВЖДИ видалити свій профіль адміністратора? Цю дію неможливо скасувати!")) {
            return;
        }
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/delete-me', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ password: confirmPassword })
            });
            const data = await res.json();
            if (res.ok) {
                alert("Ваш акаунт видалено. Зараз вас буде розлогінено.");
                onLogout(); 
            } else {
                setStatusMsg({ text: data.message || "Помилка видалення", type: 'error' });
            }
        } catch (err) {
            setStatusMsg({ text: "Помилка з'єднання з сервером", type: 'error' });
        }
    };

    const safeAppointments = Array.isArray(appointments) ? appointments : [];
    const safeDoctors = Array.isArray(doctors) ? doctors : [];

    return (
        <div className="admin-dashboard">
            {statusMsg.text && <div className={`status-notification ${statusMsg.type}`}>{statusMsg.text}</div>}
            <aside className="admin-sidebar">
                <div className="admin-logo">OnyxDent <span>Admin</span></div>
                <nav className="admin-nav">
                    <ul>
                        <li className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>Журнал візитів</li>
                        <li className={activeTab === 'system_requests' ? 'active' : ''} onClick={() => setActiveTab('system_requests')}>Заявки користувачів</li>
                        <li className={activeTab === 'doctors' ? 'active' : ''} onClick={() => setActiveTab('doctors')}>Управління лікарями</li>
                        <li className={activeTab === 'schedule' ? 'active' : ''} onClick={() => setActiveTab('schedule')}>Загальний розклад</li>
                        <li className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>Список послуг</li>
                        <li className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Статистика</li>
                        <li className={activeTab === 'manage_admins' ? 'active' : ''} onClick={() => setActiveTab('manage_admins')}>Управління адмінами</li>
                    </ul>
                </nav>
                <button className="logout-btn" onClick={onLogout}>Вийти</button>
            </aside>

            <main className="admin-content">
                <header className="admin-header">
                    <h1>
                        {activeTab === 'appointments' ? "Журнал візитів" : activeTab === 'system_requests' ? "Заявки користувачів" : "Керування клінікою"}
                    </h1>
                </header>

                {/* БАНЕР БЕЗПЕКИ ПРО ТИМЧАСОВИЙ ПАРОЛЬ ДЛЯ АДМІНІСТРАТОРА */}
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
                            <strong>🚨 Первинний вхід:</strong> Ви використовуєте автоматично згенерований тимчасовий пароль адміністратора. Перейдіть у вкладку «Управління адмінами», щоб встановити постійний надійний пароль.
                        </div>
                        <button 
                            onClick={() => {
                                setActiveTab('manage_admins');
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
                                whiteSpace: 'nowrap'
                            }}
                        >
                            Змінити зараз
                        </button>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <section className="admin-table-section">
                        <div className="table-header">
                            <h3>Останні записи</h3>
                            <button className="add-btn" onClick={handleOpenCreateModal}>
                                + Записати на прийом
                            </button>
                        </div>
                        <div className="table-container">
                            <table className="admin-table">
                                <thead>
                                    <tr><th>Пацієнт</th><th>Телефон</th><th>Дата</th><th>Дія</th></tr>
                                </thead>
                                <tbody>
                                    {safeAppointments.map((app) => (
                                        <tr key={app.id}>
                                            <td>{app.patient_name}</td>
                                            <td>{app.patient_phone}</td>
                                            <td>{new Date(app.appointment_date).toLocaleString('uk-UA')}</td>
                                            <td><button className="reset-btn-small" onClick={() => handleResetPassword(app.patient_id, app.patient_phone)}>Скинути пароль</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {activeTab === 'system_requests' && (
                    <SystemRequestsTab
                        onOpenProcessModal={handleProcessRequest}
                        onRefreshAppointments={fetchAppointments}
                    />
                )}

                {activeTab === 'doctors' && (
                    <DoctorManagement
                        appointments={appointments}
                        onTimeSlotSelect={({ doctorId, selectedDate }) => {
                            setModalMode('create');
                            setFormData({
                                isNewPatient: true, 
                                patientPhone: '',
                                patientName: '',
                                doctorId: doctorId, 
                                serviceId: '',
                                date: selectedDate.substring(0, 16) 
                            });
                            setShowModal(true); 
                        }}
                    />
                )}
                {activeTab === 'schedule' && (
                    <ClinicSchedule
                        appointments={safeAppointments}
                        doctors={safeDoctors}
                        onEventClick={handleViewAppointment}
                    />
                )}
                {activeTab === 'services' && <ServiceList />}
                {activeTab === 'stats' && <Statistics />}

                {activeTab === 'manage_admins' && (
                    <div className="admin-tab-content">
                        
                        {/* ОНОВЛЕНО: ФОРМА ЗМІНИ ПАРОЛЯ АДМІНІСТРАТОРА ПОВНІСТЮ ІДЕНТИЧНА ДО ПАЦІЄНТА */}
                        <h3>Змінити пароль</h3>
                        <form onSubmit={handlePasswordChange} className="settings-form" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '400px', marginBottom: '40px' }}>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', marginTop:'5px', fontSize: '0.9rem' }}>Поточний пароль</label>
                                <input 
                                    type="password" 
                                    className="form-input" 
                                    placeholder="Введіть старий пароль"
                                    value={passwordData.oldPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Новий пароль</label>
                                <input 
                                    type="password" 
                                    className="form-input" 
                                    placeholder="Введіть новий пароль"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                />
                            </div>
                            <button type="submit" className="save-btn" style={{ padding: '12px', background: '#1a2523', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                                Оновити пароль
                            </button>
                        </form>

                        {passwordMessage && (
                            <p style={{ marginTop: '-30px', marginBottom: '30px', fontWeight: 'bold', fontSize: '0.9rem', color: passwordMessage.includes('успішно') ? '#27ae60' : '#e74c3c' }}>
                                {passwordMessage}
                            </p>
                        )}

                        <hr style={{ margin: '30px 0', border: 'none', borderTop: '1px solid #eee' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3>Керування адміністраторами клініки</h3>
                            <button className="add-btn" onClick={() => setIsAddingAdmin(!isAddingAdmin)}>
                                {isAddingAdmin ? 'Закрити форму' : '➕ Додати нового адміністратора'}
                            </button>
                        </div>

                        {isAddingAdmin && (
                            <div style={{ background: 'white', padding: '25px', borderRadius: '20px', marginBottom: '20px', boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)' }}>
                                <h4 style={{ color: 'var(--dark-green)', marginBottom: '15px', fontFamily: 'Comfortaa' }}>Реєстрація нового адміна клініки</h4>
                                <form onSubmit={handleAddAdminSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                                    <input
                                        type="text" placeholder="ПІБ Администратора" className="form-input" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minWidth: '250px' }} required
                                        value={newAdmin.fullName} onChange={e => setNewAdmin({ ...newAdmin, fullName: e.target.value })}
                                    />
                                    <input
                                        type="text" placeholder="Телефон (+380...)" className="form-input" style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', minWidth: '200px' }} required
                                        value={newAdmin.phone} onChange={e => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                                    />
                                    <button type="submit" className="add-btn" style={{ padding: '10px 20px' }}>Зберегти та згенерувати пароль</button>
                                </form>
                            </div>
                        )}

                        <div className="admin-table-section">
                            <p style={{ color: '#666', fontSize: '0.95rem' }}>
                                💡 <b>Інформація:</b> Усі створені адміністратори мають рівні з вами права доступу до системи.
                            </p>
                        </div>

                        <div style={{ marginTop: '50px', padding: '25px', borderRadius: '20px', border: '1px dashed #e74c3c', background: '#fff5f5' }}>
                            <h4 style={{ color: '#e74c3c', marginBottom: '10px', fontFamily: 'Comfortaa' }}>🛑 Небезпечна зона</h4>
                            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '15px' }}>
                                Ви можете повністю видалити свій власний обліковий запис адміністратора.
                                Після цього ви миттєво втратите доступ до панелі системи. Заявка іншим адміністраторам не відправляється.
                            </p>

                            {!showDeleteConfirm ? (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}
                                >
                                    Видалити мій акаунт
                                </button>
                            ) : (
                                <form onSubmit={handleSelfDelete} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '400px' }}>
                                    <label style={{ fontSize: '0.85rem', color: '#555', fontWeight: 'bold' }}>
                                        Введіть ваш поточний пароль для підтвердження:
                                    </label>
                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <input
                                            type="password"
                                            placeholder="Введіть пароль"
                                            required
                                            className="form-input"
                                            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #e74c3c', flexGrow: 1 }}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                        <button
                                            type="submit"
                                            style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                                        >
                                            Підтвердити видалення
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setShowDeleteConfirm(false); setConfirmPassword(''); }}
                                            style={{ background: 'none', border: '1px solid #ccc', padding: '10px 15px', borderRadius: '8px', cursor: 'pointer' }}
                                        >
                                            Скасувати
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                )}

                <AppointmentModal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    onSubmit={handleAddVisit}
                    formData={formData}
                    setFormData={setFormData}
                    doctors={safeDoctors}
                    services={services}
                    mode={modalMode}
                    onDelete={handleCancelAppointment}
                />
            </main>
        </div>
    );
};

export default AdminAccount;