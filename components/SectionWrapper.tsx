import React from 'react'

const SectionWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
    return (
        <div className={`${className} mx-auto max-w-[1100px] px-4`}>
            {children}
        </div>
    )
}

export default SectionWrapper