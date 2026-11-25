import React from 'react';
import {
  FaPills,
  FaVial,
  FaMicroscope,
  FaLeaf,
  FaHeart,
  FaTint,
  FaSun,
  FaWind,
  FaBandAid,
  FaSpa,
  FaBolt,
  FaStethoscope,
} from 'react-icons/fa';
import './MedicalIcon.css';

// ─── Config maps for emojis to vector icons and color gradients ──────────────
const ICON_MAP = {
  '💊': FaPills,
  '🧪': FaVial,
  '🔬': FaMicroscope,
  '🌿': FaLeaf,
  '🩸': FaTint,
  '❤️': FaHeart,
  '☀️': FaSun,
  '🫀': FaHeart,
  '💨': FaWind,
  '🩹': FaBandAid,
  '🌸': FaSpa,
  '⚡': FaBolt,
  'default': FaStethoscope,
};

const GRADIENT_MAP = {
  '💊': 'linear-gradient(135deg, var(--color-neutral-100), var(--color-primary-200))', // Cyan/Blue (Analgesics)
  '🧪': 'linear-gradient(135deg, var(--color-accent-100), var(--color-accent-200))', // Emerald (Antibiotics)
  '🔬': 'linear-gradient(135deg, var(--color-neutral-200), var(--color-violet-200))', // Violet (Gastroenterology)
  '🌿': 'linear-gradient(135deg, var(--color-neutral-50), var(--color-accent-200))', // Green (Antihistamines)
  '🩸': 'linear-gradient(135deg, var(--color-neutral-200), var(--color-error-200))', // Red (Diabetes/Blood)
  '❤️': 'linear-gradient(135deg, var(--color-neutral-50), var(--color-error-200))', // Soft Red (Cardiology)
  '☀️': 'linear-gradient(135deg, var(--color-warning-100), var(--color-warning-200))', // Amber/Gold (Vitamins)
  '🫀': 'linear-gradient(135deg, var(--color-neutral-50), var(--color-error-200))', // Heart statin
  '💨': 'linear-gradient(135deg, var(--color-neutral-100), var(--color-neutral-100))', // Respiratory
  '🩹': 'linear-gradient(135deg, var(--color-orange-100), var(--color-orange-200))', // Orange (Pain relief/band-aid)
  '🌸': 'linear-gradient(135deg, var(--color-neutral-100), var(--color-rose-200))', // Pink (Dermatology/claritin)
  '⚡': 'linear-gradient(135deg, var(--color-neutral-50), var(--color-accent-200))', // Supplements
  'default': 'linear-gradient(135deg, var(--color-neutral-100), var(--color-neutral-200))', // Slate
};

const COLOR_MAP = {
  '💊': 'var(--color-primary-600)',
  '🧪': 'var(--color-accent-600)',
  '🔬': 'var(--color-violet-600)',
  '🌿': 'var(--color-accent-600)',
  '🩸': 'var(--color-error-600)',
  '❤️': 'var(--color-rose-600)',
  '☀️': 'var(--color-warning-600)',
  '🫀': 'var(--color-rose-600)',
  '💨': 'var(--color-primary-600)',
  '🩹': 'var(--color-orange-600)',
  '🌸': 'var(--color-rose-600)',
  '⚡': 'var(--color-accent-600)',
  'default': 'var(--color-secondary-500)',
};

import api from '../services/api';

const serverUrl = api.defaults.baseURL ? api.defaults.baseURL.replace('/api', '') : 'https://medeasy-backend-a5yi.onrender.com';

export default function MedicalIcon({ emoji, category, size = 32, className = '' }) {
  // Check if emoji is actually a file path (starts with /, http, data: or contains extensions)
  const isRealImage = emoji && (
    emoji.startsWith('data:') || 
    emoji.startsWith('/') || 
    emoji.startsWith('http') || 
    emoji.includes('.')
  );

  if (isRealImage) {
    let src = emoji;
    if (!emoji.startsWith('data:') && !emoji.startsWith('http') && !emoji.startsWith('/')) {
      src = `${serverUrl}/${emoji}`;
    }
    
    // For small sizes (e.g. cart, navbar lists, dashboard tables), render a small clean rounded square badge
    if (size <= 24) {
      return (
        <div
          className={`real-image-badge-small ${className}`}
          style={{
            width: size * 1.8,
            height: size * 1.8,
          }}
        >
          <img 
            src={src} 
            alt={category || "Medicine"} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      );
    }

    // For larger displays (e.g. product cards and details), let the image fill the container container/box beautifully
    return (
      <div className={`real-image-badge-large ${className}`}>
        <img 
          src={src} 
          alt={category || "Medicine"} 
        />
      </div>
    );
  }

  // Extract emoji matching key
  let key = 'default';
  if (emoji && ICON_MAP[emoji]) {
    key = emoji;
  } else if (category) {
    const lowerCat = category.toLowerCase();
    if (lowerCat.includes('pain') || lowerCat.includes('relie') || lowerCat.includes('analge')) {
      key = '🩹';
    } else if (lowerCat.includes('antibio')) {
      key = '🧪';
    } else if (lowerCat.includes('vitam') || lowerCat.includes('supple')) {
      key = '🌿';
    } else if (lowerCat.includes('diabet')) {
      key = '🩸';
    } else if (lowerCat.includes('cardio') || lowerCat.includes('heart')) {
      key = '❤️';
    } else if (lowerCat.includes('derm') || lowerCat.includes('skin')) {
      key = '🌸';
    } else if (lowerCat.includes('eye')) {
      key = '💊';
    } else if (lowerCat.includes('child')) {
      key = '⚡';
    }
  }

  const IconComponent = ICON_MAP[key];
  const background = GRADIENT_MAP[key];
  const color = COLOR_MAP[key];

  return (
    <div
      className={`medical-icon-badge ${className}`}
      style={{
        background,
        color,
        width: size * 1.8,
        height: size * 1.8,
      }}
    >
      <IconComponent size={size} />
    </div>
  );
}
