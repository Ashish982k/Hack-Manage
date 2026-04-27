"use client";
import Image from "next/image";
import * as React from "react";

type SessionLike = {
  user?: {
    image?: string | null;
  } | null;
} | null;

export const Icon = ({ session }: { session: SessionLike }) => {
  const [imgError, setImgError] = React.useState(false);

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-[#E36A6A]/20 to-[#FFB2B2]/20 flex items-center justify-center">
      {session?.user?.image && !imgError ? (
        <Image
          src={session.user.image}
          alt="User Icon"
          width={40}
          height={40}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-[#E36A6A]/35 to-[#FFB2B2]/35" />
      )}
    </div>
  );
};
