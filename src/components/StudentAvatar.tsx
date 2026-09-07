import React from 'react';

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

  // Default raster images to match the user's provided design.
  // The user should place these images in their /public folder.
  const defaultImage = isMale ? '/avatar-boy.png' : '/avatar-girl.png';
  const imageSource = photoUrl || defaultImage;
  
  return (
    <div 
      className={`relative flex items-center justify-center shrink-0 w-full h-full ${className}`} 
      style={{ width: size, height: size }}
    >
      <img 
        src={imageSource} 
        alt="Student Avatar"
        className="absolute inset-0 w-full h-full object-cover object-top"
        style={{ 
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          background: 'linear-gradient(180deg, #b0c4de 0%, #f5deb3 100%)', // Match the sky-to-peach gradient in the reference
          transform: 'scale(1.25) translateY(5%)'
        }}
        onError={(e) => {
          // If the image fails to load (e.g., they haven't uploaded it yet), 
          // we can leave the gradient background visible as a fallback.
          (e.target as HTMLImageElement).src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent 1x1 gif
        }}
      />
    </div>
  );
}
