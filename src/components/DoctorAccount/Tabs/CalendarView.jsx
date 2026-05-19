import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const CalendarView = ({ doctorId, onTimeSelect, onEventSelect }) => {
    const [events, setEvents] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEvents = () => {
            const token = localStorage.getItem('token'); // БЕЗПЕКА

            fetch(`http://localhost:5000/api/doctor/appointments/${doctorId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // БЕЗПЕКА: захист розкладу лікаря JWT токеном
                }
            })
                .then(res => res.json())
                .then(data => {
                    // БЕЗПЕКА: Валідація масиву перед застосуванням .map()
                    if (Array.isArray(data)) {
                        setEvents(data.map(app => ({
                            id: app.id.toString(),
                            title: `${app.patient_name} - ${app.service_title || 'Прийом'}`,
                            start: app.appointment_date,
                            backgroundColor: app.status === 'completed' ? '#27ae60' : '#1a2523',
                            borderColor: 'transparent',
                            extendedProps: { originalData: app }
                        })));
                    } else {
                        setEvents([]);
                        setError(data.error || 'Помилка авторизації розкладу');
                    }
                })
                .catch(err => {
                    console.error("Помилка завантаження календаря:", err);
                    setError("Не вдалося з'єднатися з сервером");
                    setEvents([]);
                });
        };

        if (doctorId) {
            fetchEvents();
        }
    }, [doctorId]);

    const handleTimeSlotSelect = (info) => {
        const isoDateString = info.startStr.substring(0, 16);
        if (onTimeSelect) onTimeSelect(isoDateString);
    };

    const handleEventClick = (info) => {
        const appointmentDetails = info.event.extendedProps.originalData;
        if (appointmentDetails && onEventSelect) onEventSelect(appointmentDetails);
    };

    return (
        <section className="calendar-view-tab">
            {error && (
                <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '10px', borderRadius: '8px', marginBottom: '15px' }}>
                    ⚠️ {error}
                </div>
            )}
            <div className="calendar-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <FullCalendar 
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]} 
                    initialView="timeGridWeek" 
                    events={events} 
                    locale="uk" 
                    height="600px"
                    selectable={true}
                    selectMirror={true}
                    select={handleTimeSlotSelect}
                    eventClick={handleEventClick}
                    slotMinTime="08:00:00" 
                    slotMaxTime="20:00:00" 
                    allDaySlot={false}     
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'timeGridWeek,timeGridDay'
                    }}
                />
            </div>
        </section>
    );
};

export default CalendarView;