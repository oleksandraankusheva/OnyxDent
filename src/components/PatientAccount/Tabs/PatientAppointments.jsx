import React, { useState, useEffect } from 'react';

const PatientAppointments = ({ userId, userName, userPhone }) => {
    const [history, setHistory] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedService, setSelectedService] = useState('');

    const fetchAppointments = () => {
        // БЕЗПЕКА: Дістаємо збережений токен
        const token = localStorage.getItem('token');

        fetch(`http://localhost:5000/api/patient/appointments/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // БЕЗПЕКА: Передаємо токен, щоб сервер не повертав 401 Unauthorized
                'Authorization': `Bearer ${token}`
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Помилка авторизації");
                return res.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setHistory(data);
                } else {
                    setHistory([]);
                }
            })
            .catch(err => {
                console.error("Помилка завантаження візитів:", err);
                setHistory([]);
            });
    };

    useEffect(() => {
        fetchAppointments();
        
        // Завантаження послуг для форми швидкого запису
        fetch('http://localhost:5000/api/services')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setServices(data);
            })
            .catch(err => console.error("Помилка завантаження послуг:", err));
    }, [userId]);

    const handleRequestAppointment = async (e) => {
        e.preventDefault();
        if (!selectedService) return alert("Оберіть послугу");
        
        const token = localStorage.getItem('token');

        const res = await fetch('http://localhost:5000/api/patient/request-appointment', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                patientId: userId,
                patientName: userName,
                patientPhone: userPhone,
                serviceId: selectedService
            })
        });
        if (res.ok) {
            alert("Заявку надіслано! Адміністратор зв'яжеться з вами.");
            setSelectedService('');
        }
    };

    const handleCancelRequest = async (id) => {
        if (window.confirm("Надіслати запит адміністратору на скасування цього візиту?")) {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch('http://localhost:5000/api/patient/create-admin-request', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ patientId: userId, type: 'cancel_appointment', appointmentId: id })
                });
                if (res.ok) alert("Запит на скасування надіслано адміну.");
            } catch (error) {
                console.error(error);
            }
        }
    };

    // Функція обчислення динамічного статусу та фільтрації візитів пацієнта
    const getAppointmentStatus = (appointmentDateStr, durationMinutes = 60) => {
        const now = new Date();
        const appStart = new Date(appointmentDateStr);
        const appEnd = new Date(appStart.getTime() + durationMinutes * 60000);

        // Перевірка, чи збігається день (сьогодні)
        const isToday = now.getFullYear() === appStart.getFullYear() &&
                        now.getMonth() === appStart.getMonth() &&
                        now.getDate() === appStart.getDate();

        // 1. Якщо запис відбувається прямо зараз
        if (now >= appStart && now <= appEnd) {
            return { text: "У процесі", color: "#9b59b6", visible: true }; // Фіолетовий
        }

        if (isToday) {
            if (now < appStart) {
                // 2. Якщо запис сьогодні і він ще не відбувся по часу
                return { text: "Заплановано", color: "#f39c12", visible: true }; // Помаранчевий
            } else {
                // 3. Якщо запис сьогодні і він відбувся по часу
                return { text: "Завершено", color: "#27ae60", visible: true }; // Зелений
            }
        } else {
            if (now < appStart) {
                // 4. Якщо запис НЕ сьогодні і він буде в майбутньому
                return { text: "Заплановано", color: "#f39c12", visible: true }; // Помаранчевий
            } else {
                // 5. Якщо запис НЕ сьогодні і він уже відбувся по часу (минуле)
                return { text: "", color: "", visible: false }; // Приховати (немає взагалі)
            }
        }
    };

    return (
        <section className="appointments-section">
            <div style={{ marginBottom: '30px', padding: '20px', background: '#ffffff', borderRadius: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                <h4 style={{ marginBottom: '10px' }}>✨ Швидкий запис на новий прийом</h4>
                <form onSubmit={handleRequestAppointment} style={{ display: 'flex', gap: '15px' }}>
                    <select 
                        className="form-input"
                        value={selectedService}
                        onChange={e => setSelectedService(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', flex: 1, margin: 0 }}
                    >
                        <option value="">Оберіть бажану послугу...</option>
                        {services.map(s => (
                            <option key={s.id} value={s.id}>{s.title} ({s.price} грн)</option>
                        ))}
                    </select>
                    <button type="submit" className="save-btn" style={{ padding: '10px 25px', background: '#3498db', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Надіслати заявку
                    </button>
                </form>
            </div>

            <h3 style={{ marginBottom: '15px' }}>📋 Мої візити</h3>
            <table className="appointments-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                        <th style={{ padding: '12px' }}>Дата</th>
                        <th style={{ padding: '12px' }}>Час</th>
                        <th style={{ padding: '12px' }}>Лікар</th>
                        <th style={{ padding: '12px' }}>Послуга</th>
                        <th style={{ padding: '12px' }}>Статус</th>
                        <th style={{ padding: '12px' }}>Дія</th>
                    </tr>
                </thead>
                <tbody>
                    {history
                        .map(app => {
                            const statusInfo = getAppointmentStatus(app.appointment_date, app.duration_minutes || 60);
                            return { ...app, statusInfo };
                        })
                        .filter(app => app.statusInfo.visible)
                        .map(app => {
                            const dateObj = new Date(app.appointment_date);
                            return (
                                <tr key={app.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px' }}>{dateObj.toLocaleDateString('uk-UA')}</td>
                                    <td className="app-time" style={{ padding: '12px', fontWeight: 'bold' }}>
                                        {dateObj.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}
                                    </td>
                                    <td style={{ padding: '12px' }}>{app.doctor_name || 'Призначається'}</td>
                                    <td style={{ padding: '12px' }}>{app.service_title}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span className="status-label" style={{ 
                                            backgroundColor: app.statusInfo.color,
                                            color: 'white', 
                                            padding: '6px 12px', 
                                            borderRadius: '20px', 
                                            fontSize: '0.85rem',
                                            fontWeight: 'bold',
                                            display: 'inline-block'
                                        }}>
                                            {app.statusInfo.text}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {app.statusInfo.text === "Заплановано" && (
                                            <button onClick={() => handleCancelRequest(app.id)} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                                                Скасувати візит
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    {history.filter(app => getAppointmentStatus(app.appointment_date, app.duration_minutes || 60).visible).length === 0 && (
                        <tr>
                            <td colSpan="6" style={{ padding: '20px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                                Актуальних записів на прийом не знайдено.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </section>
    );
};

export default PatientAppointments;