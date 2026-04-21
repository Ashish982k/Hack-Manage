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
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
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
        <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-pink-500/30" />
      )}
    </div>
  );
};
