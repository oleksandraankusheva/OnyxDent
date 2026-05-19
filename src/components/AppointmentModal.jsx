import React from 'react';

const AppointmentModal = ({ 
    isOpen, 
    onClose, 
    onSubmit, 
    formData, 
    setFormData, 
    doctors = [], 
    services = [], // Додано проп послуг
    mode = 'create', 
    onDelete, 
    userRole = 'admin',
    onOpenMedicalCard 
}) => {
    if (!isOpen) return null;

    // Шукаємо ім'я лікаря: спочатку перевіряємо, чи воно вже прийшло з бекенду (doctor_name), інакше шукаємо по id у масиві
    const doctorName = formData.doctor_name || doctors.find(d => d.id.toString() === formData.doctorId?.toString())?.full_name || 'Не вказано';

    // Шукаємо назву послуги: спочатку з об'єкта (service_title), інакше шукаємо по id у масиві
    const serviceTitle = formData.service_title || services.find(s => s.id.toString() === formData.serviceId?.toString())?.title || 'Консультація';

    return (
        <div className="modal-overlay">
            <div className="admin-modal" style={{ maxWidth: '450px' }}>
                
                {/* 1. РЕЖИМ ПЕРГЛЯДУ (КАРТКА ВІЗИТУ) */}
                {mode === 'view' ? (
                    <div className="appointment-view-card">
                        <h2 style={{ marginBottom: '20px', color: '#1a2523' }}>Деталі прийому</h2>
                        
                        <div style={{ textAlign: 'left', lineHeight: '1.8', marginBottom: '25px', fontSize: '1.05rem' }}>
                            <p>👤 <b>Пацієнт:</b> {formData.patientName || 'Зареєстрований клієнт'}</p>\n                            <p>📞 <b>Телефон:</b> {formData.patientPhone || 'Не вказано'}</p>
                            <p>👨‍⚕️ <b>Лікар:</b> {doctorName}</p>
                            <p>🦷 <b>Послуга:</b> {serviceTitle}</p>
                            <p>📅 <b>Час візиту:</b> {formData.date ? new Date(formData.date).toLocaleString('uk-UA') : 'Не вказано'}</p>
                        </div>

                        <div className="modal-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {userRole === 'doctor' && onOpenMedicalCard && (
                                <button 
                                    type="button"
                                    className="form-submit-btn" 
                                    onClick={() => { onOpenMedicalCard(formData); onClose(); }}
                                >
                                    📑 Відкрити мед. карту
                                </button>
                            )}
                            
                            {userRole === 'admin' && onDelete && (
                                <button 
                                    type="button" 
                                    className="cancel-btn" 
                                    style={{ backgroundColor: '#e74c3c', color: 'white' }}
                                    onClick={onDelete}
                                >
                                    ❌ Скасувати візит
                                </button>
                            )}
                            
                            <button type="button" className="cancel-btn" onClick={onClose}>
                                Закрити
                            </button>
                        </div>
                    </div>
                ) : (
                    
                    /* 2. РЕЖИМ СТВОРЕННЯ ЗАПИСУ */
                    <>
                        <h2>Запис на прийом</h2>
                        <form onSubmit={onSubmit}>
                            {userRole !== 'doctor' && (
                                <div className="form-group checkbox-group">
                                    <label>
                                        <input 
                                            type="checkbox" 
                                            checked={formData.isNewPatient} 
                                            onChange={(e) => setFormData({ ...formData, isNewPatient: e.target.checked })} 
                                        /> Новий пацієнт?
                                    </label>
                                </div>
                            )}

                            <input 
                                type="tel" 
                                placeholder="Телефон" 
                                className="form-input" 
                                required 
                                value={formData.patientPhone} 
                                onChange={(e) => setFormData({ ...formData, patientPhone: e.target.value })} 
                            />

                            {(formData.isNewPatient || userRole === 'doctor') && (
                                <input 
                                    type="text" 
                                    placeholder="Ім'я пацієнта" 
                                    className="form-input" 
                                    required 
                                    value={formData.patientName} 
                                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })} 
                                />
                            )}

                            {userRole !== 'doctor' && (
                                <select 
                                    className="form-input" 
                                    required 
                                    value={formData.doctorId}
                                    onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                                >
                                    <option value="">Оберіть лікаря</option>
                                    {doctors.map(d => (
                                        <option key={d.id} value={d.id}>{d.full_name}</option>
                                    ))}
                                </select>
                            )}

                            <select 
                                className="form-input" 
                                required 
                                value={formData.serviceId}
                                onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}
                            >
                                <option value="">Оберіть послугу</option>
                                {services.map(s => (
                                    <option key={s.id} value={s.id}>{s.title} ({s.price} грн)</option>
                                ))}
                            </select>

                            <input 
                                type="datetime-local" 
                                className="form-input" 
                                required 
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
                            />

                            <div className="modal-actions">
                                <button type="submit" className="form-submit-btn">Створити запис</button>
                                <button type="button" className="cancel-btn" onClick={onClose}>Скасувати</button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default AppointmentModal;