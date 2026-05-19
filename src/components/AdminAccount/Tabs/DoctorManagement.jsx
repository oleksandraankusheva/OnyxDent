import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const DoctorManagement = ({ appointments, onTimeSlotSelect }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [doctorEvents, setDoctorEvents] = useState([]);
    
    // Стейт для відкриття форми додавання лікаря
    const [isAdding, setIsAdding] = useState(false);
    const [newDoctor, setNewDoctor] = useState({
        fullName: '',
        phone: '+38',
        specialization: ''
    });

    const fetchDoctors = () => {
        const token = localStorage.getItem('token');
        fetch('http://localhost:5000/api/admin/doctors', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        })
        .then(res => res.json())
        .then(data => {
            if (Array.isArray(data)) {
                setDoctors(data);
            } else {
                setDoctors([]);
            }
        })
        .catch(err => {
            console.error(err);
            setDoctors([]);
        });
    };

    useEffect(() => {
        fetchDoctors();
    }, []);

    // Фільтруємо події для конкретного обраного лікаря
    useEffect(() => {
        if (selectedDoctor && appointments && appointments.length > 0) {
            const filtered = appointments
                .filter(app => app.doctor_id === parseInt(selectedDoctor) && app.status !== 'cancelled')
                .map(app => ({
                    id: app.id.toString(),
                    title: app.patient_name || 'Прийом',
                    start: new Date(app.appointment_date),
                    end: new Date(new Date(app.appointment_date).getTime() + 60 * 60 * 1000), // +1 година
                    color: '#9b59b6'
                }));
            setDoctorEvents(filtered);
        } else {
            setDoctorEvents([]);
        }
    }, [selectedDoctor, appointments]);

    // ОБРОБНИК: Виділення часу на календарі лікаря
    const handleTimeSelect = (selectInfo) => {
        if (!selectedDoctor) return;

        // Отримуємо об'єкт обраного лікаря, щоб передати його ПІБ
        const currentDoc = doctors.find(d => d.id === parseInt(selectedDoctor));

        // Викликаємо батьківську функцію, передаючи туди дату/час та дані лікаря
        if (onTimeSlotSelect) {
            onTimeSlotSelect({
                doctorId: parseInt(selectedDoctor),
                doctorName: currentDoc ? currentDoc.full_name : '',
                selectedDate: selectInfo.startStr // Формат ISO рядка (наприклад, 2026-05-20T10:30:00)
            });
        }

        // Знімаємо виділення з календаря
        const calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
    };

    const handleAddDoctorSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            const res = await fetch('http://localhost:5000/api/admin/doctors', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newDoctor)
            });
            if (res.ok) {
                alert('Лікаря успішно додано!');
                setIsAdding(false);
                setNewDoctor({ fullName: '', phone: '+38', specialization: '' });
                fetchDoctors();
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="admin-tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3>Управління лікарями клініки OnyxDent</h3>
                <button className="add-btn" onClick={() => setIsAdding(!isAdding)}>
                    {isAdding ? 'Закрити форму' : '➕ Додати нового лікаря'}
                </button>
            </div>

            {isAdding && (
                <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #e0e0e0' }}>
                    <h4>Реєстрація нового спеціаліста</h4>
                    <form onSubmit={handleAddDoctorSubmit} style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <input 
                            type="text" placeholder="ПІБ Лікаря" className="form-input" required
                            value={newDoctor.fullName} onChange={e => setNewDoctor({...newDoctor, fullName: e.target.value})}
                        />
                        <input 
                            type="text" placeholder="Телефон" className="form-input" required
                            value={newDoctor.phone} onChange={e => setNewDoctor({...newDoctor, phone: e.target.value})}
                        />
                        <input 
                            type="text" placeholder="Спеціалізація (напр. Ортодонт)" className="form-input" required
                            value={newDoctor.specialization} onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})}
                        />
                        <button type="submit" className="add-btn" style={{ padding: '10px 20px' }}>Зберегти</button>
                    </form>
                </div>
            )}

            <div className="filter-bar" style={{ marginBottom: '20px' }}>
                <select className="form-input" value={selectedDoctor} onChange={(e) => setSelectedDoctor(e.target.value)}>
                    <option value="">Оберіть лікаря для перегляду розкладу</option>
                    {doctors.map(d => (
                        <option key={d.id} value={d.id}>
                            {d.full_name} ({d.specialization || 'Стоматолог'})
                        </option>
                    ))}
                </select>
                {selectedDoctor && (
                    <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '5px' }}>
                        💡 <b>Порада:</b> Виділіть мишкою вільний часовий слот у календарі нижче, щоб швидко записати пацієнта до цього лікаря.
                    </p>
                )}
            </div>
            
            {selectedDoctor && (
                <div className="calendar-card" style={{ background: 'white', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        locale="uk"
                        events={doctorEvents}
                        selectable={true}        
                        selectMirror={true}      
                        select={handleTimeSelect} 
                        slotMinTime="08:00:00"
                        slotMaxTime="20:00:00"
                        allDaySlot={false}
                        height="600px"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'timeGridWeek,timeGridDay'
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default DoctorManagement;