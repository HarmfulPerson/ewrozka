'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiContact } from '../lib/api';
import { Header } from '../components/layout/header';
import { Footer } from '../components/layout/footer';
import { VantaBackground } from '../components/vanta-background/vanta-background';
import './kontakt.css';

export default function KontaktPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiContact({
        name: name.trim() || 'Anonim',
        email: email.trim(),
        subject: subject.trim() || undefined,
        message: message.trim(),
      });
      toast.success('Wiadomość została wysłana. Odpowiemy tak szybko, jak to możliwe.');
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Wystąpił błąd. Spróbuj ponownie.';
      if (msg.includes('3') || msg.toLowerCase().includes('limit')) {
        toast.error('Maksymalnie 3 zgłoszenia. Spróbuj ponownie później.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="kontakt-page">
      <VantaBackground>
      <Header />
      <main className="kontakt-main">
        <div className="kontakt-inner">
          <Link href="/" className="kontakt-back">
            ← Wróć
          </Link>
          <h1 className="kontakt-title">Kontakt</h1>

          <div className="kontakt-layout">
            <form className="kontakt-form" onSubmit={handleSubmit}>
              <div className="kontakt-form__row kontakt-form__row--2col">
                <div>
                  <label className="kontakt-form__label" htmlFor="name">Imię</label>
                  <input id="name" type="text" className="kontakt-form__input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Imię" />
                </div>
                <div>
                  <label className="kontakt-form__label" htmlFor="email">E-mail <span className="required">*</span></label>
                  <input id="email" type="email" className="kontakt-form__input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.pl" required />
                </div>
              </div>
              <div className="kontakt-form__row">
                <label className="kontakt-form__label" htmlFor="subject">Temat</label>
                <input id="subject" type="text" className="kontakt-form__input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Temat wiadomości" />
              </div>
              <div className="kontakt-form__row">
                <label className="kontakt-form__label" htmlFor="message">Wiadomość <span className="required">*</span></label>
                <textarea id="message" className="kontakt-form__textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Twoja wiadomość..." required />
              </div>
              <button type="submit" className="kontakt-form__submit" disabled={loading}>
                {loading ? 'Wysyłanie...' : 'Wyślij'}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
      </VantaBackground>
    </div>
  );
}
