interface FormSectionProps {
  label?: React.ReactNode;
  labelSuffix?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  label,
  labelSuffix,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      {label && (
        labelSuffix ? (
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium text-base-content/70">
              {label}
            </label>
            {labelSuffix}
          </div>
        ) : (
          <label className="text-sm font-medium text-base-content/70">
            {label}
          </label>
        )
      )}
      {children}
    </div>
  );
}
