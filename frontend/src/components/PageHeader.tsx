import React from 'react';

const PageHeader: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => <div className="mb-6 min-w-0 border-b border-slate-200/80 pb-5 sm:mb-7"><h1 className="break-words text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h1><p className="mt-2 max-w-3xl break-words text-sm leading-6 text-slate-500">{subtitle}</p></div>;

export default PageHeader;
