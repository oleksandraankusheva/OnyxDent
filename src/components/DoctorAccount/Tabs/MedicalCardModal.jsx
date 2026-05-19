import React from 'react';

const MedicalCardModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    title, 
    notes, 
    setNotes, 
    patientName,
    appointments = [],
    selectedAppointmentId,
    onAppointmentChange
}) => {
    if (!isOpen) return null;

    return (
        <div className="treatment-modal-overlay">
            <div className="treatment-modal">
                <h3>{title}: {patientName}</h3>
                
                {/* Вибір конкретного візиту для перегляду чи додавання нотаток */}
                {appointments.length > 0 ? (
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: '#666' }}>
                            Оберіть дату прийому для редагування протоколу:
                        </label>
                        <select 
                            value={selectedAppointmentId} 
                            onChange={(e) => onAppointmentChange && onAppointmentChange(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #ddd', fontFamily: 'inherit' }}
                        >
                            {appointments.map(app => (
                                <option key={app.id} value={app.id}>
                                    {new Date(app.appointment_date).toLocaleString('uk-UA')} — {app.service_title || 'Візит'} ({app.status === 'completed' ? 'Завершено' : 'Заплановано'})
                                </option>
                            ))}
                        </select>
                    </div>
                ) : (
                    <p style={{ color: '#e74c3c', fontStyle: 'italic', marginBottom: '15px' }}>У пацієнта немає зафіксованих візитів.</p>
                )}

                <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Введіть протокол лікування або примітки до карти..."
                    disabled={appointments.length === 0}
                />
                <div className="modal-actions">
                    <button className="save-btn" onClick={onSave} disabled={appointments.length === 0}>Зберегти</button>
                    <button className="close-btn" onClick={onClose}>Закрити</button>
                </div>
            </div>
        </div>
    );
};

export default MedicalCardModal;