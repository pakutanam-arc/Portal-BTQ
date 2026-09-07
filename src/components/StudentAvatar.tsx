import React from 'react';
import { AVATAR_BOY_BASE64, AVATAR_GIRL_BASE64 } from '../assets/cardAssetsBase64';

interface StudentAvatarProps {
  gender: string;
  photoUrl?: string;
  className?: string;
  size?: number | string;
  studentName?: string;
}

export function StudentAvatar({ gender, photoUrl, studentName = '', className = '', size = 64 }: StudentAvatarProps) {
  // Normalize gender string
  const normalizedGender = String(gender || '').trim().toUpperCase();
  const isMale = normalizedGender === 'L' || normalizedGender === 'LAKI-LAKI' || normalizedGender === 'MALE' || normalizedGender === 'PRIA';

  // Reliable base64 raster images so prints/PDFs never lose images
  const defaultImage = isMale ? AVATAR_BOY_BASE64 : AVATAR_GIRL_BASE64;
  const imageSource = photoUrl || defaultImage;
  
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 w-full h-full overflow-hidden ${className}`} 
      style={{ width: size, height: size }}
    >
      <img 
        src={imageSource} 
        alt={studentName || "Student Avatar"}
        className="w-full h-full object-cover object-center shrink-0"
        onError={(e) => {
          // If custom photo fails, fallback to standard base64 avatar
          (e.target as HTMLImageElement).src = defaultImage;
        }}
      />
    </div>
  );
}
