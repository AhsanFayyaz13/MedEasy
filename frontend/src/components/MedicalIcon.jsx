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
  '💊': 'linear-gradient(135deg, #e0f2fe, #bae6fd)', // Cyan/Blue (Analgesics)
  '🧪': 'linear-gradient(135deg, #d1fae5, #a7f3d0)', // Emerald (Antibiotics)
  '🔬': 'linear-gradient(135deg, #ede9fe, #ddd6fe)', // Violet (Gastroenterology)
  '🌿': 'linear-gradient(135deg, #f0fdf4, #bbf7d0)', // Green (Antihistamines)
  '🩸': 'linear-gradient(135deg, #fee2e2, #fecaca)', // Red (Diabetes/Blood)
  '❤️': 'linear-gradient(135deg, #fff5f5, #ffc9c9)', // Soft Red (Cardiology)
  '☀️': 'linear-gradient(135deg, #fef3c7, #fde68a)', // Amber/Gold (Vitamins)
  '🫀': 'linear-gradient(135deg, #fff5f5, #ffc9c9)', // Heart statin
  '💨': 'linear-gradient(135deg, #f0f9ff, #e0f2fe)', // Respiratory
  '🩹': 'linear-gradient(135deg, #ffedd5, #fed7aa)', // Orange (Pain relief/band-aid)
  '🌸': 'linear-gradient(135deg, #fdf2f8, #fbcfe8)', // Pink (Dermatology/claritin)
  '⚡': 'linear-gradient(135deg, #ecfdf5, #a7f3d0)', // Supplements
  'default': 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', // Slate
};

const COLOR_MAP = {
  '💊': '#0284c7',
  '🧪': '#059669',
  '🔬': '#7c3aed',
  '🌿': '#16a34a',
  '🩸': '#dc2626',
  '❤️': '#e11d48',
  '☀️': '#d97706',
  '🫀': '#e11d48',
  '💨': '#0284c7',
  '🩹': '#ea580c',
  '🌸': '#db2777',
  '⚡': '#059669',
  'default': '#475569',
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
