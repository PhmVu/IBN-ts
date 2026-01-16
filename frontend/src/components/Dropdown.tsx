import { useState, useRef, useEffect } from 'react'

interface DropdownProps {
    trigger: React.ReactNode
    children: React.ReactNode
}

export function Dropdown({ trigger, children }: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
                {trigger}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow-lg">
                    <div className="py-1">{children}</div>
                </div>
            )}
        </div>
    )
}

interface DropdownItemProps {
    onClick?: () => void
    children: React.ReactNode
}

export function DropdownItem({ onClick, children }: DropdownItemProps) {
    return (
        <button
            onClick={onClick}
            className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
            {children}
        </button>
    )
}
