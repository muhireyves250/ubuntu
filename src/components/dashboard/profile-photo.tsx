"use client";

import { getInitials } from "@/lib/format";
import { useMyProfile } from "@/lib/auth/use-my-profile";

// The signed-in user's avatar: their photo when one is set, otherwise their
// initials. `className` carries each spot's own size and colours, exactly as
// the initials circle there was styled before.
export function ProfilePhoto({ name, className, src }: { name: string; className: string; src?: string | null }) {
  const { data } = useMyProfile();
  const photo = src !== undefined ? src : data?.avatarUrl;
  return (
    <span className={`${className} overflow-hidden`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimize
        <img src={photo} alt="" className="h-full w-full object-cover" />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
