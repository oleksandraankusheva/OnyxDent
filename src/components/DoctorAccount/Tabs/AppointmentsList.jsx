import React, { useState, useEffect } from 'react';

const AppointmentsList = ({ doctorId, onEventSelect }) => {
    const [appointments, setAppointments] = useState([]);
    const [pendingCards, setPendingCards] = useState([]); // Стейт для «боргів» з минулих днів
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAllAppointmentsData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const headers = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

            // Завантажуємо всі прийоми лікаря з бекенду
            const response = await fetch(`http://localhost:5000/api/doctor/appointments/${doctorId}`, {
                method: 'GET',
                headers
            });

            const data = await response.json();

            if (response.ok) {
                if (Array.isArray(data)) {
                    const now = new Date();
                    
                    // Отримуємо сьогоднішню дату в форматі YYYY-MM-DD для точного порівняння днів
                    const todayStr = now.toLocaleDateString('en-CA'); 

                    // 1. Фільтруємо прийоми суто НА СЬОГОДНІ (активні)
                    const todayActive = data.filter(app => {
                        const appDateStr = new Date(app.appointment_date).toLocaleDateString('en-CA');
                        return appDateStr === todayStr && app.status !== 'cancelled';
                    });

                    // 2. Фільтруємо «БОРГИ» (прийоми за минулі дні, де НЕ ЗАПОВНЕНА карта і запис не скасовано)
                    const pastUnfilled = data.filter(app => {
                        const appDateStr = new Date(app.appointment_date).toLocaleDateString('en-CA');
                        const isPastDay = appDateStr < todayStr;
                        const isNotesEmpty = !app.notes || app.notes.trim().length === 0;
                        return isPastDay && isNotesEmpty && app.status !== 'cancelled';
                    });

                    setAppointments(todayActive);
                    setPendingCards(pastUnfilled);
                } else {
                    setAppointments([]);
                    setPendingCards([]);
                }
            } else {
                setError(data.error || 'Помилка завантаження прийомів');
                setAppointments([]);
                setPendingCards([]);
            }
        } catch (err) {
            console.error("Помилка запиту розкладу лікаря:", err);
            setError("Не вдалося з'єднатися з сервером");
            setAppointments([]);
            setPendingCards([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (doctorId) {
            fetchAllAppointmentsData();
        }
    }, [doctorId]);

    // Функція для динамічного визначення статусу за часом
    const getLiveStatus = (appointmentDateStr) => {
        const now = new Date();
        const startTime = new Date(appointmentDateStr);
        // Припускаємо умовну тривалість прийому — 60 хвилин
        const durationMinutes = 60; 
        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        if (now < startTime) {
            return { label: 'Заплановано', color: '#f39c12' }; // Помаранчевий
        } else if (now >= startTime && now <= endTime) {
            return { label: 'У процесі', color: '#9b59b6' }; // Фіолетовий
        } else {
            return { label: 'Завершено', color: '#27ae60' }; // Зелений
        }
    };

    // Форматування часу
    const formatTime = (dateStr) => {
        return new Date(dateStr).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
    };

    // Форматування дати для блоку боргів
    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    if (loading) return <div className="tab-loading" style={{ padding: '20px' }}>Завантаження списку прийомів...</div>;

    return (
        <div className="appointments-list-container" style={{ padding: '10px' }}>
            {error && (
                <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px', borderRadius: '10px', marginBottom: '20px' }}>
                    ⚠️ {error}
                </div>
            )}

            {/* ========================================================================= */}
            {/* БЛОК 1: ПРИЙОМИ З МИНУЛИХ ДНІВ ІЗ НЕЗАПОВНЕНИМИ КАРТАМИ («БОРГИ») */}
            {/* ========================================================================= */}
            {pendingCards.length > 0 && (
                <div style={{
                    backgroundColor: '#fff3cd',
                    borderLeft: '6px solid #e67e22',
                    padding: '20px',
                    borderRadius: '15px',
                    marginBottom: '30px',
                    boxShadow: '0 4px 15px rgba(230, 126, 34, 0.08)'
                }}>
                    <h4 style={{ color: '#d35400', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🚨 Потребують заповнення медичної карти ({pendingCards.length})
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#a04000', marginBottom: '15px' }}>
                        Знайдено прийоми з минулих днів, для яких ви ще не залишили протокол лікування чи рекомендації:
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
                        {pendingCards.map((app) => (
                            <div 
                                key={`pending-${app.id}`}
                                onClick={() => onEventSelect && onEventSelect(app)} // Клік відкриває модалку для заповнення
                                style={{
                                    background: 'white',
                                    padding: '15px',
                                    borderRadius: '10px',
                                    border: '1px solid #ffeeba',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#777', marginBottom: '8px' }}>
                                    <span>📅 {formatDate(app.appointment_date)}</span>
                                    <span>🕒 {formatTime(app.appointment_date)}</span>
                                </div>
                                <div style={{ fontWeight: 'bold', color: '#1a2523', marginBottom: '4px' }}>👤 {app.patient_name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#555', marginBottom: '8px' }}>🦷 {app.service_title || 'Консультація'}</div>
                                <div style={{ color: '#e74c3c', fontSize: '0.8rem', fontWeight: 'bold' }}>⚠️ Не заповнена карта</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* БЛОК 2: ОСНОВНИЙ СПИСОК ПРИЙОМІВ НА СЬОГОДНІ */}
            {/* ========================================================================= */}
            <h3 style={{ marginBottom: '20px', color: '#1a2523', fontFamily: "'Comfortaa', sans-serif" }}>
                📋 Прийоми на сьогодні
            </h3>

            {appointments.length === 0 ? (
                <p style={{ color: '#666', fontStyle: 'italic', background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
                    На сьогодні прийомів більше не заплановано.
                </p>
            ) : (
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                    gap: '20px'
                }}>
                    {appointments.map((app) => {
                        const appStatus = getLiveStatus(app.appointment_date);
                        const time = formatTime(app.appointment_date);
                        const isCardFilled = app.notes && app.notes.trim().length > 0;

                        return (
                            <div 
                                key={app.id} 
                                onClick={() => onEventSelect && onEventSelect(app)}
                                style={{ 
                                    background: 'white',
                                    borderRadius: '15px',
                                    padding: '20px',
                                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.05)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    borderLeft: `5px solid ${appStatus.color}`,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'none';
                                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.05)';
                                }}
                            >
                                {/* Верхня частина картки: Статус та Точний Час початку */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <span style={{ 
                                        backgroundColor: appStatus.color,
                                        color: 'white', 
                                        padding: '5px 12px', 
                                        borderRadius: '20px', 
                                        fontSize: '0.8rem',
                                        fontWeight: 'bold'
                                    }}>
                                        ● {appStatus.label}
                                    </span>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1a2523' }}>
                                        🕒 {time}
                                    </div>
                                </div>

                                {/* Середня частина: Пацієнт */}
                                <div style={{ marginBottom: '15px' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1a2523', marginBottom: '6px' }}>
                                        👤 {app.patient_name}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', color: '#555' }}>
                                        📞 {app.patient_phone}
                                    </div>
                                </div>

                                {/* Нижня частина: Назва стоматологічної послуги */}
                                <div style={{ fontSize: '0.9rem', color: '#444', fontWeight: '500', marginBottom: '15px' }}>
                                    🦷 {app.service_title || 'Консультація'}
                                </div>

                                {/* Статус Валідації Карти Пацієнта */}
                                <div style={{ 
                                    borderTop: '1px solid #f0f0f0', 
                                    paddingTop: '12px',
                                    fontSize: '0.85rem', 
                                    color: isCardFilled ? '#27ae60' : '#e74c3c',
                                    fontWeight: 'bold'
                                }}>
                                    {isCardFilled ? '📝 Карта заповнена' : '⚠️ Не заповнена карта'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppointmentsList;