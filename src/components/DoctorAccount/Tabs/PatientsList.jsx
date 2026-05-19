import React, { useState, useEffect } from 'react';
import MedicalCardModal from './MedicalCardModal';

const PatientsList = ({ doctorId }) => {
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [patientAppointments, setPatientAppointments] = useState([]); // Зберігаємо прийоми
    const [selectedAppointmentId, setSelectedAppointmentId] = useState(''); // ID прийому для редагування
    const [notes, setNotes] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch(`http://localhost:5000/api/doctor/my-patients/${doctorId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setPatients(data);
                else setPatients([]);
            })
            .catch(err => {
                console.error(err);
                setPatients([]);
            });
    }, [doctorId]);

    const handleOpenCard = async (patient) => {
    try {
        const token = localStorage.getItem('token');
        
        // Додаємо ?doctorId=${doctorId} до кінця URL-адреси
        const response = await fetch(`http://localhost:5000/api/patient/appointments/${patient.id}?doctorId=${doctorId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const safeData = Array.isArray(data) ? data : [];
        
        setPatientAppointments(safeData);
        setSelectedPatient(patient);

        // Якщо є прийоми САМЕ ЦЬОГО лікаря, обираємо найновіший
        if (safeData.length > 0) {
            setSelectedAppointmentId(safeData[0].id);
            setNotes(safeData[0].notes || '');
        } else {
            setSelectedAppointmentId('');
            setNotes('Історія ваших прийомів з цим пацієнтом порожня.');
        }
    } catch (error) {
        console.error("Помилка завантаження картки:", error);
    }
};

    // РЕАЛЬНЕ ЗБЕРЕЖЕННЯ В БАЗУ ДАНИХ
    const handleSaveMedicalCard = async () => {
    if (!selectedAppointmentId) {
        alert("Немає прийому для збереження запису!");
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        // ОНОВЛЕНО: Тепер ми чітко кажемо серверу, що візит завершено!
        const status = 'completed'; 

        const response = await fetch(`http://localhost:5000/api/doctor/update-notes/${selectedAppointmentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                notes: notes, // Твої рекомендації / протокол лікування
                status: status // Новий статус 'completed'
            })
        });

        if (response.ok) {
            alert("📝 Запис у медичній карті збережено!");
            setSelectedPatient(null);
            
            // Оновлюємо сторінку, щоб картка на вкладці "Записи" миттєво стала зеленою
            window.location.reload();
        } else {
            alert("Помилка сервера при збереженні картки.");
        }
    } catch (error) {
        console.error("Помилка збереження:", error);
        alert("Не вдалося з'єднатися з сервером.");
    }
};

    // Функція зміни прийому в селекті всередині модалки
    const handleAppointmentChange = (appId) => {
        setSelectedAppointmentId(appId);
        const targetApp = patientAppointments.find(a => a.id === parseInt(appId));
        setNotes(targetApp?.notes || '');
    };

    const safePatients = Array.isArray(patients) ? patients : [];
    const filteredPatients = safePatients.filter(p => 
        p.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <section className="patients-section">
            <div className="search-bar">
                <input 
                    type="text" 
                    placeholder="Пошук пацієнта за ПІБ..." 
                    className="search-input" 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
           <table className="appointments-table">
                <thead><tr><th>ПІБ</th><th>Телефон</th><th>Дія</th></tr></thead>
                <tbody>
                    {filteredPatients.map(p => (
                        <tr key={p.id}>
                            <td>{p.full_name}</td>
                            <td>{p.phone}</td>
                            <td>
                                <button className="action-link" onClick={() => handleOpenCard(p)}>
                                    Редагувати карту
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Модальне вікно з вибором дати візиту */}
            <MedicalCardModal 
                isOpen={!!selectedPatient}
                onClose={() => setSelectedPatient(null)}
                onSave={handleSaveMedicalCard} // Передаємо реальну функцію збереження
                title="Медична карта"
                notes={notes}
                setNotes={setNotes}
                patientName={selectedPatient?.full_name}
                appointments={patientAppointments} // Передаємо прийоми для списку
                selectedAppointmentId={selectedAppointmentId}
                onAppointmentChange={handleAppointmentChange}
            />
        </section>
    );
};

export default PatientsList;