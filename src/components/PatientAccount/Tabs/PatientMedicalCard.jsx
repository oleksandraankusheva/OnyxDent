import React, { useState, useEffect } from 'react';

const PatientMedicalCard = ({ userId }) => {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token'); // БЕЗПЕКА
        fetch(`http://localhost:5000/api/patient/appointments/${userId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // БЕЗПЕКА
            }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setHistory(data.filter(app => app.status === 'completed'));
                } else {
                    setHistory([]);
                }
            })
            .catch(err => {
                console.error(err);
                setHistory([]);
            });
    }, [userId]);

    const safeHistory = Array.isArray(history) ? history : []; // БЕЗПЕКА

    return (
        <section className="patients-section">
            <h3>Історія лікування та протоколи</h3>
            <div className="medical-history-list" style={{ marginTop: '20px' }}>
                {safeHistory.length > 0 ? safeHistory.map(record => (
                    <div key={record.id} className="medical-record-item" style={{
                        borderLeft: '4px solid #1a2523',
                        background: '#fdfdfd',
                        padding: '20px',
                        borderRadius: '0 15px 15px 0',
                        marginBottom: '15px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                    }}>
                        <div className="record-header">
                            <strong>{new Date(record.appointment_date).toLocaleDateString('uk-UA')}</strong> — {record.service_title}
                        </div>
                        <div className="record-doctor" style={{ fontSize: '0.9rem', color: '#666' }}>
                            Лікар: {record.doctor_name}
                        </div>
                        <div className="record-notes" style={{
                            background: '#fff', padding: '15px', borderRadius: '10px',
                            border: '1px dashed #ddd', marginTop: '10px'
                        }}>
                            <strong>Призначення та нотатки:</strong>
                            <p style={{ marginTop: '5px', color: '#444', lineHeight: '1.5' }}>
                                {record.notes || "Детальний протокол відсутній"}
                            </p>
                        </div>
                    </div>
                )) : <p>У вас ще немає завершених візитів з медичними записами.</p>}
            </div>
        </section>
    );
};

export default PatientMedicalCard;