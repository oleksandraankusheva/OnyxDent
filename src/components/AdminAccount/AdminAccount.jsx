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
    const [services, setServices] = useState([]); // Додано стейт послуг
    const [activeTab, setActiveTab] = useState('appointments');
    const [formData, setFormData] = useState({
        isNewPatient: false,
        patientPhone: '',
        patientName: '',
        doctorId: '',
        serviceId: '',
        date: '',
        requestId: null,
        isFromSite: false // Прапорець для позначення заявки з сайту
    });

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

    useEffect(() => {
        fetchAppointments();
        fetchDoctors();
        fetchServices();
    }, []);

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
            // Перевіряємо, чи ми схвалюємо саме публічний запит з сайту (без id користувача)
            const endpoint = formData.isFromSite 
                ? 'http://localhost:5000/api/admin/add-visit' // Для заявок без акаунта
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
    
    // Обробка кліку на запис з сайту або кабінету пацієнта всередині SystemRequestsTab
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
                        {/* ОНОВЛЕНО: ТУТ ОДНА ЄДИНА ВКЛАДКА ДЛЯ ВСІХ ЗАЯВОК */}
                        <li className={activeTab === 'system_requests' ? 'active' : ''} onClick={() => setActiveTab('system_requests')}>Заявки користувачів</li>
                        <li className={activeTab === 'doctors' ? 'active' : ''} onClick={() => setActiveTab('doctors')}>Управління лікарями</li>
                        <li className={activeTab === 'schedule' ? 'active' : ''} onClick={() => setActiveTab('schedule')}>Загальний розклад</li>
                        <li className={activeTab === 'services' ? 'active' : ''} onClick={() => setActiveTab('services')}>Список послуг</li>
                        <li className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>Статистика</li>
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
        // ОСЬ НОВИЙ ОБРОБНИК, ЯКИЙ МИ ДОДАЄМО:
        onTimeSlotSelect={({ doctorId, selectedDate }) => {
            setModalMode('create');
            setFormData({
                isNewPatient: true, // За замовчуванням адмін введе ім'я та телефон вручну
                patientPhone: '',
                patientName: '',
                doctorId: doctorId, // Автоматично підставляємо лікаря, чий календар дивилися
                serviceId: '',
                date: selectedDate.substring(0, 16) // Обрізаємо секунди для сумісності з datetime-local (YYYY-MM-DDTHH:mm)
            });
            setShowModal(true); // Відкриваємо модалку запису
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