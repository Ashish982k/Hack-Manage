"use client";
import * as React from "react";

export const Icon = ({ session }: { session: any }) => {
  const [imgError, setImgError] = React.useState(false);

  const handleImageError = () => {
    setImgError(true);
  };

  return (
    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
      {session?.user?.image && !imgError ? (
        <img
          src={session.user.image}
          alt="User Icon"
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
