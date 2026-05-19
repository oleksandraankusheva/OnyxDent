import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const ClinicSchedule = ({ appointments, doctors, onEventClick }) => {
    const [events, setEvents] = useState([]);

    // Функція генерації кольору для лікаря (щоб візуально розрізняти їх на загальному графіку)
    const getDoctorColor = (doctorId) => {
        const colors = ['#3498db', '#9b59b6', '#e67e22', '#1abc9c', '#e74c3c'];
        return colors[doctorId % colors.length] || '#34495e';
    };

    useEffect(() => {
        if (appointments && appointments.length > 0) {
            const allEvents = appointments.map(app => {
                const dateObj = new Date(app.appointment_date);

                return {
                    id: app.id.toString(),
                    // ТЕПЕР відображається суто ім'я пацієнта за твоїм запитом
                    title: app.patient_name || 'Невідомий пацієнт',
                    start: dateObj,
                    // Додаємо тривалість візиту (наприклад, 1 година), щоб картка красиво рендерилась
                    end: new Date(dateObj.getTime() + 60 * 60 * 1000), 
                    backgroundColor: app.status === 'completed' ? '#27ae60' : getDoctorColor(app.doctor_id),
                    borderColor: 'transparent',
                    allDay: false,
                    // Передаємо оригінальний об'єкт візиту всередину події FullCalendar
                    extendedProps: { appointmentData: app }
                };
            });
            setEvents(allEvents);
        } else {
            setEvents([]);
        }
    }, [appointments]);

    // Обробник натискання на подію в календарі
    const handleEventClick = (info) => {
        const appData = info.event.extendedProps.appointmentData;
        if (appData && onEventClick) {
            onEventClick(appData); // Передаємо дані візиту в батьківський компонент
        }
    };

    return (
        <div className="admin-tab-content">
            <h3>Загальний розклад клініки OnyxDent</h3>
            <div className="calendar-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', marginTop: '15px' }}>
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    locale="uk"
                    events={events}
                    eventClick={handleEventClick} // Реєструємо клік
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    allDaySlot={false}
                    height="650px"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'timeGridWeek,timeGridDay,dayGridMonth'
                    }}
                />
            </div>
        </div>
    );
};

export default ClinicSchedule;