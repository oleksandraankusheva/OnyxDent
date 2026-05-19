import React, { useState, useEffect } from 'react';

const Statistics = () => {
    const [stats, setStats] = useState({ 
        byDoctor: [], 
        byService: [], 
        totalPatients: 0, 
        totalRevenue: 0 
    });
    const [loading, setLoading] = useState(true);
    const [fileFormat, setFileFormat] = useState('txt');

    useEffect(() => {
        const token = localStorage.getItem('token'); // БЕЗПЕКА
        fetch('http://localhost:5000/api/admin/stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // БЕЗПЕКА: передаємо токен
            }
        })
            .then(res => {
                if (!res.ok) throw new Error("Помилка сервера");
                return res.json();
            })
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Не вдалося завантажити аналітику:", err);
                setLoading(false);
            });
    }, []);

    const generateTxtReport = (currentDate) => {
        let text = `==================================================\n`;
        text += `          ЗВІТ АНАЛІТИКИ КЛІНІКИ OnyxDent         \n`;
        text += `          Сформовано: ${currentDate}              \n`;
        text += `==================================================\n\n`;
        
        text += `📊 ГОЛОВНІ ПОКАЗНИКИ:\n`;
        text += `--------------------------------------------------\n`;
        text += `• Всього зареєстрованих пацієнтів: ${stats.totalPatients}\n`;
        text += `• Очікуваний оборот клініки:       ${stats.totalRevenue.toLocaleString('uk-UA')} грн\n`;
        text += `• Кількість активних лікарів:      ${stats.byDoctor.length}\n\n`;
        
        text += `👨‍⚕️ НАВАНТАЖЕННЯ ЛІКАРІВ (КІЛЬКІСТЬ ВІЗИТІВ):\n`;
        text += `--------------------------------------------------\n`;
        if (stats.byDoctor.length === 0) {
            text += `Немає даних про лікарів.\n`;
        } else {
            stats.byDoctor.forEach((doc) => {
                text += `• ${doc.full_name.padEnd(35)} | Візитів: ${doc.count}\n`;
            });
        }
        text += `\n`;

        text += `📈 ПОПУЛЯРНІСТЬ ПОСЛУГ СЕРЕД КЛІЄНТІВ:\n`;
        text += `--------------------------------------------------\n`;
        if (stats.byService.length === 0) {
            text += `Немає даних про надані послуги.\n`;
        } else {
            stats.byService.forEach((service, index) => {
                text += `${index + 1}. ${service.title.padEnd(35)} | Проведено: ${service.count} раз(ів)\n`;
            });
        }
        text += `\n==================================================\n`;
        text += `               Кінець звіту OnyxDent              \n`;
        return { content: text, mime: 'text/plain;charset=utf-8;' };
    };

    const generateCsvReport = (currentDate) => {
        let csv = `\uFEFF`; 
        csv += `Категорія;Параметр;Значення\n`;
        csv += `Загальне;Дата формування;${currentDate}\n`;
        csv += `Загальне;Всього пацієнтів;${stats.totalPatients}\n`;
        csv += `Загальне;Очікуваний оборот (грн);${stats.totalRevenue}\n`;
        csv += `Загальне;Активних лікарів;${stats.byDoctor.length}\n\n`;
        
        csv += `Лікарі;ПІБ лікаря;Кількість візитів\n`;
        stats.byDoctor.forEach(doc => {
            csv += `Лікарі;${doc.full_name};${doc.count}\n`;
        });
        csv += `\n`;

        csv += `Послуги;Назва послуги;Кількість проведених\n`;
        stats.byService.forEach(service => {
            csv += `Послуги;${service.title};${service.count}\n`;
        });

        return { content: csv, mime: 'text/csv;charset=utf-8;' };
    };

    const handleDownloadReport = () => {
        const currentDate = new Date().toLocaleString('uk-UA');
        let fileData;

        if (fileFormat === 'csv') {
            fileData = generateCsvReport(currentDate);
        } else {
            fileData = generateTxtReport(currentDate);
        }

        const blob = new Blob([fileData.content], { type: fileData.mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        
        const fileNameDate = new Date().toISOString().slice(0, 10);
        link.setAttribute("download", `OnyxDent_Report_${fileNameDate}.${fileFormat}`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return <div className="admin-tab-content"><h3>Завантаження аналітики...</h3></div>;
    }

    return (
        <div className="admin-tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0 }}>Аналітичні показники</h3>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <select 
                        value={fileFormat} 
                        onChange={(e) => setFileFormat(e.target.value)}
                        className="form-input"
                        style={{ width: '160px', margin: 0, padding: '8px 12px', height: '40px', borderRadius: '8px' }}
                    >
                        <option value="txt">Текстовий (.txt)</option>
                        <option value="csv">Таблиця Excel (.csv)</option>
                    </select>

                    <button 
                        onClick={handleDownloadReport} 
                        className="add-btn" 
                        style={{ 
                            background: '#27ae60', 
                            color: 'white', 
                            padding: '0 18px', 
                            height: '40px',
                            borderRadius: '8px', 
                            border: 'none', 
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: 0
                        }}
                    >
                        📥 Завантажити
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ display: 'flex', gap: '20px', marginBottom: '25px' }}>
                <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, color: '#666' }}>Всього пацієнтів</p>                  <h3 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', color: '#1a2523' }}>{stats.totalPatients}</h3>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, color: '#666' }}>Очікуваний оборот</p>                  <h3 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', color: '#27ae60' }}>{stats.totalRevenue.toLocaleString('uk-UA')} грн</h3>
                </div>
                <div className="stat-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', flex: 1, boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}>
                    <p style={{ margin: 0, color: '#666' }}>Активних лікарів</p>                 <h3 style={{ margin: '10px 0 0 0', fontSize: '1.8rem', color: '#3498db' }}>{stats.byDoctor.length}</h3>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                <div className="stat-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <h4 style={{ marginBottom: '15px', color: '#1a2523', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        📊 Популярність послуг
                    </h4>
                    {stats.byService.length === 0 ? (
                        <p style={{ color: '#888' }}>Немає проведених процедур</p>
                    ) : (
                        stats.byService.map((s, index) => (
                            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', margin: '10px 0', fontSize: '0.95rem' }}>
                                <span>{index + 1}. {s.title}</span>
                                <span><b>{s.count}</b> візитів</span>
                            </div>
                        ))
                    )}
                </div>

                <div className="stat-card" style={{ background: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                    <h4 style={{ marginBottom: '15px', color: '#1a2523', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                        👨‍⚕️ Навантаження лікарів
                    </h4>
                    {stats.byDoctor.length === 0 ? (
                        <p style={{ color: '#888' }}>У системі ще немає лікарів</p>
                    ) : (
                        stats.byDoctor.map((d) => (
                            <div key={d.id} style={{ margin: '12px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', marginBottom: '4px' }}>
                                    <span>{d.full_name}</span>
                                    <span><b>{d.count}</b> візитів</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: '#f0f2f5', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ 
                                        width: `${Math.min(d.count * 10, 100)}%`, 
                                        height: '100%', 
                                        background: '#3498db', 
                                        borderRadius: '3px' 
                                    }}></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Statistics;