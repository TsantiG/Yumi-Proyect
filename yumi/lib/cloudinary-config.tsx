"use client";
import { CldImage } from 'next-cloudinary';

interface CloudImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    }

export default function CloudImage({ src, alt, width = 300, height = 300 }: CloudImageProps) {
  return (
    <CldImage
      src={src}
      width={width}
      height={height}
      alt={alt}
      crop={{ type: 'auto', source: true }}
    />
  );
}