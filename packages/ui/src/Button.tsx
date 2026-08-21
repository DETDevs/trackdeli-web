export const Button = ({ children, variant = 'primary' }: { children: React.ReactNode, variant?: 'primary' | 'secondary' | 'danger' }) => {
  return <button className={`btn btn-${variant}`}>{children}</button>;
};
