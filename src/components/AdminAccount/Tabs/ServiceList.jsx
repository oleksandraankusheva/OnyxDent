import React, { useState, useEffect } from 'react';

const ServiceList = () => {
    const [services, setServices] = useState([]);
    const [editingService, setEditingService] = useState(null);
    const [isAdding, setIsAdding] = useState(false); // Стан для відкриття форми додавання
    
    // Спільні дані для форми (і для редагування, і для додавання)
    const [formData, setFormData] = useState({ title: '', price: '', duration_minutes: '' });

    const fetchServices = () => {
        fetch('http://localhost:5000/api/services')
            .then(res => res.json())
            .then(data => setServices(data))
            .catch(err => console.error("Помилка завантаження послуг:", err));
    };

    useEffect(() => {
        fetchServices();
    }, []);

    // Обробка початку додавання нової послуги
    const handleAddClick = () => {
        setIsAdding(true);
        setEditingService(null); // Закриваємо редагування, якщо воно було відкрите
        setFormData({ title: '', price: '', duration_minutes: '' });
    };

    // Натискання на кнопку "Редагувати"
    const handleEditClick = (service) => {
        setIsAdding(false); // Закриваємо додавання, якщо воно було відкрите
        setEditingService(service.id);
        setFormData({
            title: service.title,
            price: service.price,
            duration_minutes: service.duration_minutes || ''
        });
    };

    // Скасування будь-якої дії
    const handleCancel = () => {
        setIsAdding(false);
        setEditingService(null);
        setFormData({ title: '', price: '', duration_minutes: '' });
    };

    // Збереження змін при РЕДАГУВАННІ
    const handleSaveEdit = async (id) => {
        try {
            const response = await fetch(`http://localhost:5000/api/admin/services/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setEditingService(null);
                fetchServices();
            } else {
                alert("Не вдалося оновити послугу");
            }
        } catch (error) {
            console.error("Помилка при збереженні:", error);
        }
    };

    // Збереження при СТВОРЕННІ нової послуги
    const handleSaveCreate = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/admin/services', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setIsAdding(false);
                setFormData({ title: '', price: '', duration_minutes: '' });
                fetchServices(); // Перезавантажуємо список із новою послугою
            } else {
                const errData = await response.json();
                alert(errData.error || "Не вдалося додати послугу");
            }
        } catch (error) {
            console.error("Помилка при додаванні послуги:", error);
        }
    };

    return (
        <div className="admin-tab-content">
            <div className="table-header">
                <h3>Актуальні послуги</h3>
                {/* Кнопка тепер активна і викликає функцію створення */}
                <button className="add-btn" onClick={handleAddClick} disabled={isAdding}>
                    + Додати послугу
                </button>
            </div>
            
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>Назва</th>
                        <th>Ціна (грн)</th>
                        <th>Тривалість (текст)</th>
                        <th>Дія</th>
                    </tr>
                </thead>
                <tbody>
                    {/* РЯДОК ДЛЯ ДОДАВАННЯ НОВОЇ ПОСЛУГИ ( inline-форма ) */}
                    {isAdding && (
                        <tr style={{ backgroundColor: '#fcfcfc', borderLeft: '4px solid #3498db' }}>
                            <td>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    placeholder="Назва послуги"
                                    value={formData.title} 
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                />
                            </td>
                            <td>
                                <input 
                                    type="number" 
                                    className="form-input"
                                    placeholder="Ціна"
                                    value={formData.price} 
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                />
                            </td>
                            <td>
                                <input 
                                    type="text" 
                                    className="form-input"
                                    placeholder="напр. 45 хв або 1 год"
                                    value={formData.duration_minutes} 
                                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                />
                            </td>
                            <td>
                                <button className="add-btn" onClick={handleSaveCreate} style={{ marginRight: '5px', padding: '5px 10px' }}>
                                    Створити
                                </button>
                                <button className="cancel-btn" onClick={handleCancel} style={{ padding: '5px 10px' }}>
                                    Скасувати
                                </button>
                            </td>
                        </tr>
                    )}

                    {/* ВИВЕДЕННЯ ІСНУЮЧИХ ПОСЛУГ */}
                    {services.map(s => (
                        <tr key={s.id}>
                            {editingService === s.id ? (
                                <>
                                    <td>
                                        <input 
                                            type="text" 
                                            className="form-input"
                                            value={formData.title} 
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="number" 
                                            className="form-input"
                                            value={formData.price} 
                                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                        />
                                    </td>
                                    <td>
                                        <input 
                                            type="text" 
                                            className="form-input"
                                            value={formData.duration_minutes} 
                                            onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                                        />
                                    </td>
                                    <td>
                                        <button className="add-btn" onClick={() => handleSaveEdit(s.id)} style={{ marginRight: '5px', padding: '5px 10px' }}>
                                            Зберегти
                                        </button>
                                        <button className="cancel-btn" onClick={handleCancel} style={{ padding: '5px 10px' }}>
                                            Скасувати
                                        </button>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td>{s.title}</td>
                                    <td>{s.price} грн</td>
                                    <td>{s.duration_minutes || '—'}</td>
                                    <td>
                                        <button className="edit-link" onClick={() => handleEditClick(s)}>
                                            Редагувати
                                        </button>
                                    </td>
                                </>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ServiceList;