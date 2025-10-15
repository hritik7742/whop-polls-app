"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"

interface ReadMoreTextProps {
  text: string
  maxLength?: number
  className?: string
  showButton?: boolean
}

export function ReadMoreText({ 
  text, 
  maxLength = 100, 
  className = "",
  showButton = true 
}: ReadMoreTextProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const shouldTruncate = text.length > maxLength
  const displayText = isExpanded || !shouldTruncate ? text : text.substring(0, maxLength) + "..."
  
  if (!shouldTruncate || !showButton) {
    return <span className={className}>{text}</span>
  }

  return (
    <div className="space-y-2">
      <p className={className}>
        {displayText}
      </p>
      {shouldTruncate && showButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-auto p-0 text-xs text-primary hover:text-primary"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Read More
            </>
          )}
        </Button>
      )}
    </div>
  )
}
