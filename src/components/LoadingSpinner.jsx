export default function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' };

  return (
    <div className={`inline-block ${sizes[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`} />
  );
}
