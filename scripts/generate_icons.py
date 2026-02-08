"""Generate Teams app icons for MDEdit."""
from PIL import Image, ImageDraw, ImageFont
import os

MANIFEST_DIR = os.path.join(os.path.dirname(__file__), '..', 'manifest')

# Colors matching the app's accent color
BG_COLOR = (99, 102, 241)       # #6366F1 (indigo)
TEXT_COLOR = (255, 255, 255)     # white


def rounded_rect(draw, xy, radius, fill):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = xy
    r = radius
    # Four corners
    draw.ellipse([x0, y0, x0 + 2*r, y0 + 2*r], fill=fill)
    draw.ellipse([x1 - 2*r, y0, x1, y0 + 2*r], fill=fill)
    draw.ellipse([x0, y1 - 2*r, x0 + 2*r, y1], fill=fill)
    draw.ellipse([x1 - 2*r, y1 - 2*r, x1, y1], fill=fill)
    # Rectangles to fill gaps
    draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
    draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)


def draw_markdown_icon(draw, size, fg_color):
    """Draw a stylized markdown 'M↓' symbol."""
    # We'll draw the letters "M" and "d" in a clean way using line drawing
    # for a more iconic look than plain text

    margin = size * 0.2
    x0 = margin
    x1 = size - margin
    y0 = margin
    y1 = size - margin
    w = x1 - x0
    h = y1 - y0

    stroke = max(2, int(size * 0.06))

    # Draw a rounded document shape as background outline
    doc_margin = size * 0.12
    doc_x0 = doc_margin
    doc_y0 = doc_margin
    doc_x1 = size - doc_margin
    doc_y1 = size - doc_margin
    fold = size * 0.15

    # Document body (rounded bottom corners, square top-right for fold)
    doc_points = [
        (doc_x0 + size*0.05, doc_y0),       # top-left (slightly rounded)
        (doc_x1 - fold, doc_y0),             # top-right before fold
        (doc_x1, doc_y0 + fold),             # fold corner
        (doc_x1, doc_y1 - size*0.05),        # bottom-right
        (doc_x0, doc_y1 - size*0.05),        # bottom-left
        (doc_x0, doc_y0 + size*0.05),        # back to top-left
    ]

    # --- Draw "M" on the left side ---
    m_x0 = x0 + w * 0.02
    m_x1 = x0 + w * 0.52
    m_y0 = y0 + h * 0.15
    m_y1 = y0 + h * 0.75
    m_w = m_x1 - m_x0
    m_mid = (m_x0 + m_x1) / 2

    # M: left vertical
    draw.line([(m_x0, m_y1), (m_x0, m_y0)], fill=fg_color, width=stroke)
    # M: left diagonal down
    draw.line([(m_x0, m_y0), (m_mid, m_y0 + (m_y1 - m_y0)*0.55)], fill=fg_color, width=stroke)
    # M: right diagonal up
    draw.line([(m_mid, m_y0 + (m_y1 - m_y0)*0.55), (m_x1, m_y0)], fill=fg_color, width=stroke)
    # M: right vertical
    draw.line([(m_x1, m_y0), (m_x1, m_y1)], fill=fg_color, width=stroke)

    # --- Draw down arrow on the right side ---
    arr_cx = x0 + w * 0.74
    arr_y0 = y0 + h * 0.15
    arr_y1 = y0 + h * 0.75
    arr_w = w * 0.18

    # Vertical line of arrow
    draw.line([(arr_cx, arr_y0), (arr_cx, arr_y1)], fill=fg_color, width=stroke)
    # Arrow head - left
    draw.line([(arr_cx - arr_w, arr_y1 - arr_w), (arr_cx, arr_y1)], fill=fg_color, width=stroke)
    # Arrow head - right
    draw.line([(arr_cx + arr_w, arr_y1 - arr_w), (arr_cx, arr_y1)], fill=fg_color, width=stroke)


def generate_color_icon():
    """Generate 192x192 full-color icon."""
    size = 192
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle background
    rounded_rect(draw, (0, 0, size - 1, size - 1), radius=32, fill=BG_COLOR)

    # Draw the markdown icon
    draw_markdown_icon(draw, size, TEXT_COLOR)

    path = os.path.join(MANIFEST_DIR, 'color.png')
    img.save(path, 'PNG')
    print(f"Created {path} ({size}x{size})")


def generate_outline_icon():
    """Generate 32x32 white outline icon on transparent background."""
    # Render at 4x then downscale for anti-aliased result
    render_size = 128
    img = Image.new('RGBA', (render_size, render_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw the markdown icon in white
    draw_markdown_icon(draw, render_size, (255, 255, 255, 255))

    # Downscale to 32x32 with high-quality resampling
    img = img.resize((32, 32), Image.LANCZOS)

    path = os.path.join(MANIFEST_DIR, 'outline.png')
    img.save(path, 'PNG')
    print(f"Created {path} (32x32)")


if __name__ == '__main__':
    generate_color_icon()
    generate_outline_icon()
    print("Done!")
