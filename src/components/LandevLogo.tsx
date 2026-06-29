import logoSrc from "../../public/app-icon.png";

type LandevLogoProps = {
  className?: string;
  alt?: string;
};

export function LandevLogo({ className, alt = "LANDEV" }: LandevLogoProps) {
  const classes = className ? `landev-logo ${className}` : "landev-logo";
  return <img src={logoSrc} alt={alt} className={classes} decoding="async" />;
}
