import React, { useState } from 'react';
import './LandingPage.css';
import logo from '../../public/Logo-2.svg';

const LoginPage = ({ onBack, onLogin }) => {
    const [login, setLogin] = useState('+38');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handlePhoneChange = (e) => {
        const value = e.target.value;
        
        if (value.startsWith('+38')) {
            setLogin(value);
        } else if (value.length < 3) {
            setLogin('+38');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: login, password: password })
            });

            const data = await response.json();

            if (response.ok) {
                // БЕЗПЕКА ТА СЕСІЯ: Надійно зберігаємо JWT та профайл у браузері
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Викликаємо функцію входу з роллю, яку повернула БД
                onLogin(data.user.role, data.user);
            } else {
                alert(data.message);
            }
        } catch (error) {
            alert("Сервер недоступний");
        }
    };

    return (
        <div className="landing-container login-page">
            <nav className="navbar">
                <div className="nav-content">
                    <div className="logo-container" onClick={onBack} style={{ cursor: 'pointer' }}>
                        <img src={logo} alt="OnyxDent Logo" className="logo-img" />
                    </div>
                    <ul className="nav-menu">
                        <li onClick={onBack}>Повернутися назад</li>
                    </ul>
                </div>
            </nav>

            <section className="login-section">
                <div className="login-card">
                    <h2 className="section-title">Вхід у кабінет</h2>
                    <p className="login-subtitle">Будь ласка, введіть ваші дані</p>

                    <form className="login-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Логін</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="+380XXXXXXXXX"
                                value={login}
                                onChange={handlePhoneChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Пароль</label>
                            <div className="password-input-wrapper" style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: '45px' }}
                                />
                                <button
                                    type="button"
                                    className="password-toggle-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '15px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1.2rem',
                                        padding: 0,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    {showPassword ? '👁️‍🗨️' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <button type="submit" className="form-submit-btn login-btn">
                            Увійти
                        </button>
                    </form>

                    <div className="login-footer">
                        <p className="login-subtitle">Увага! Увійти можливо лише після першого запису на прийом. Зв'яжіться з адмінстраторм.</p>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LoginPage;