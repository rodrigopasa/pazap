import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Bold, Italic, Link, Smile } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"

interface RichTextareaProps extends Omit<React.ComponentProps<"textarea">, 'onChange'> {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  maxLength?: number
  showFormatting?: boolean
  showEmojis?: boolean
}

const emojis = [
  "😊", "😂", "❤️", "👍", "🙏", "💪", "🎉", "🔥", "⭐", "✅",
  "💯", "🚀", "💡", "📱", "🎯", "👏", "🌟", "💝", "🌈", "🌺"
]

const RichTextarea = React.forwardRef<HTMLTextAreaElement, RichTextareaProps>(
  ({ 
    className, 
    value, 
    onChange, 
    placeholder = "Digite sua mensagem...", 
    maxLength = 4000,
    showFormatting = true,
    showEmojis = true,
    ...props 
  }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    const insertText = (text: string) => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newValue = value.substring(0, start) + text + value.substring(end)
      
      onChange(newValue)
      
      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + text.length, start + text.length)
      }, 0)
    }

    const addFormatting = (type: 'bold' | 'italic' | 'link') => {
      const textarea = textareaRef.current
      if (!textarea) return

      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const selectedText = value.substring(start, end)

      let formattedText = ""
      let cursorOffset = 0

      switch (type) {
        case 'bold':
          formattedText = `*${selectedText}*`
          cursorOffset = selectedText ? 0 : 1
          break
        case 'italic':
          formattedText = `_${selectedText}_`
          cursorOffset = selectedText ? 0 : 1
          break
        case 'link':
          if (selectedText) {
            // Se há texto selecionado, assume que é uma URL
            formattedText = selectedText.startsWith('http') 
              ? selectedText 
              : `https://${selectedText}`
          } else {
            formattedText = "https://"
            cursorOffset = 0
          }
          break
      }

      const newValue = value.substring(0, start) + formattedText + value.substring(end)
      onChange(newValue)

      // Restore cursor position
      setTimeout(() => {
        textarea.focus()
        const newPosition = start + formattedText.length - cursorOffset
        textarea.setSelectionRange(newPosition, newPosition)
      }, 0)
    }

    const addEmoji = (emoji: string) => {
      insertText(emoji)
    }

    // Detectar e formatar URLs automaticamente
    const formatWithLinks = (text: string) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g
      return text.replace(urlRegex, (url) => url)
    }

    return (
      <div className="space-y-2">
        {/* Barra de Ferramentas */}
        {(showFormatting || showEmojis) && (
          <div className="border border-gray-200 rounded-t-md p-2 bg-gray-50 flex items-center gap-2 flex-wrap">
            {/* Botões de Formatação */}
            {showFormatting && (
              <div className="flex items-center gap-1 border-r border-gray-300 pr-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addFormatting('bold')}
                  className="h-8 w-8 p-0"
                  title="Negrito (*texto*)"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addFormatting('italic')}
                  className="h-8 w-8 p-0"
                  title="Itálico (_texto_)"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => addFormatting('link')}
                  className="h-8 w-8 p-0"
                  title="Adicionar Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Emojis */}
            {showEmojis && (
              <div className="flex items-center gap-1 flex-wrap">
                <Smile className="h-4 w-4 text-gray-500 mr-1" />
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => addEmoji(emoji)}
                    className="hover:bg-gray-200 rounded p-1 text-sm"
                    title={`Adicionar ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campo de Texto */}
        <div className="relative">
          <Textarea
            ref={(node) => {
              textareaRef.current = node
              if (typeof ref === 'function') ref(node)
              else if (ref) ref.current = node
            }}
            className={cn(
              showFormatting || showEmojis ? "rounded-t-none border-t-0" : "",
              className
            )}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            {...props}
          />
          
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              Use *negrito*, _itálico_ ou adicione links diretamente
            </p>
            <span className="text-xs text-gray-400">
              {value.length}/{maxLength}
            </span>
          </div>
        </div>

        {/* Preview de Links */}
        {value && (
          <div className="text-xs text-gray-600">
            {value.match(/(https?:\/\/[^\s]+)/g) && (
              <div className="bg-blue-50 p-2 rounded border-l-4 border-blue-200">
                <p className="font-medium text-blue-800">Links detectados:</p>
                <div className="space-y-1 mt-1">
                  {value.match(/(https?:\/\/[^\s]+)/g)?.map((link, index) => (
                    <div key={index} className="text-blue-600 break-all">
                      {link}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }
)

RichTextarea.displayName = "RichTextarea"

export { RichTextarea }