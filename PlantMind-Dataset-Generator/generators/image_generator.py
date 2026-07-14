import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

class EquipmentImageGenerator:
    def __init__(self, output_dir):
        self.output_dir = Path(output_dir)
        self.image_dir = self.output_dir / "Images"
        self.image_dir.mkdir(parents=True, exist_ok=True)
        
    def generate_all_images(self, assets):
        for asset in assets:
            self.generate_equipment_image(asset)
            
    def generate_equipment_image(self, asset):
        # Create a 640x480 canvas for the image
        img = Image.new("RGB", (640, 480), color="#F8FAFC")
        draw = ImageDraw.Draw(img)
        
        # Draw Border
        draw.rectangle([(10, 10), (630, 470)], outline="#475569", width=3)
        
        # Header Box
        draw.rectangle([(13, 13), (627, 60)], fill="#1E293B")
        
        # Use default font or load simple one if available
        try:
            font_title = ImageFont.load_default()
            font_body = ImageFont.load_default()
        except IOError:
            font_title = ImageFont.load_default()
            font_body = ImageFont.load_default()
            
        # Draw Company Logo and Name on Header
        draw.text((25, 25), "STEELFORGE INDUSTRIES - HOSUR PLANT", fill="#F1F5F9")
        draw.rectangle([(550, 20), (600, 50)], fill="#38BDF8", outline="#F1F5F9", width=1)
        draw.text((560, 28), "LOGO", fill="#1E293B")
        
        # Draw Equipment Details
        draw.text((40, 90), f"EQUIPMENT NAME: {asset['name']}", fill="#0F172A")
        draw.text((40, 115), f"EQUIPMENT TAG: {asset['tag']}", fill="#0F172A")
        draw.text((40, 140), f"CRITICALITY: {asset['criticality']}", fill="#EF4444" if asset['criticality'] == 'Critical' else "#0F172A")
        draw.text((40, 165), f"SPECIFICATIONS: {asset['specs']}", fill="#334155")
        
        # Draw a physical diagram of the equipment inside a frame
        diagram_box = [(40, 200), (600, 440)]
        draw.rectangle(diagram_box, outline="#64748B", fill="#FFFFFF", width=2)
        draw.text((50, 210), "TECHNICAL SCHEMATIC DIAGRAM", fill="#64748B")
        
        # Draw actual shapes depending on equipment type
        cls = asset["class"]
        if cls == "P": # Pump: Draw circles and impeller blades
            draw.ellipse([(260, 270), (380, 390)], outline="#0284C7", width=3, fill="#E0F2FE")
            draw.line([(320, 270), (320, 390)], fill="#0284C7", width=2)
            draw.line([(260, 330), (380, 330)], fill="#0284C7", width=2)
            # Outlet pipe
            draw.rectangle([(320, 230), (340, 270)], outline="#0284C7", width=2, fill="#E0F2FE")
            draw.text((290, 325), "PUMP UNIT", fill="#0F172A")
        elif cls == "HX": # Heat Exchanger: Draw shell with internal tubes
            draw.rectangle([(200, 260), (440, 360)], outline="#0D9488", width=3, fill="#F0FDFA")
            # Tube bundles
            draw.line([(200, 290), (440, 290)], fill="#0D9488", width=2)
            draw.line([(200, 310), (440, 310)], fill="#0D9488", width=2)
            draw.line([(200, 330), (440, 330)], fill="#0D9488", width=2)
            # Flanges
            draw.rectangle([(190, 250), (200, 370)], fill="#0D9488")
            draw.rectangle([(440, 250), (450, 370)], fill="#0D9488")
            draw.text((270, 305), "SHELL & TUBE HX", fill="#0F172A")
        elif cls == "V": # Valve: Draw butterfly/gate shape
            draw.polygon([(240, 260), (300, 320), (240, 380)], outline="#D97706", fill="#FEF3C7")
            draw.polygon([(360, 260), (300, 320), (360, 380)], outline="#D97706", fill="#FEF3C7")
            draw.ellipse([(285, 305), (315, 335)], outline="#D97706", fill="#FFFFFF")
            # Actuator stem
            draw.line([(300, 320), (300, 240)], fill="#D97706", width=3)
            # Actuator head
            draw.ellipse([(270, 220), (330, 240)], outline="#D97706", fill="#FEF3C7")
            draw.text((275, 360), "VALVE ACTUATOR", fill="#0F172A")
        elif cls == "B": # Boiler: Draw large vessel with fire pit
            draw.rectangle([(230, 240), (410, 420)], outline="#EA580C", width=3, fill="#FFEDD5")
            draw.rectangle([(270, 380), (370, 420)], fill="#EA580C")
            draw.text((290, 395), "COMBUSTION", fill="#FFFFFF")
            # Chimney
            draw.rectangle([(305, 180), (335, 240)], outline="#EA580C", width=2, fill="#FFEDD5")
            draw.text((295, 300), "STEAM GENERATOR", fill="#0F172A")
        else: # Generic block diagram
            draw.rectangle([(220, 250), (420, 390)], outline="#475569", width=3, fill="#F1F5F9")
            draw.text((270, 310), "ROTARY EQUIPMENT", fill="#0F172A")
            
        # Draw some OCR text labels on the drawing canvas
        draw.text((50, 415), f"SERIAL NO: SF-{asset['tag']}-2022", fill="#475569")
        draw.text((380, 415), "STEELFORGE ASSET ID LABELS", fill="#475569")
        
        # Save image
        img.save(str(self.image_dir / f"{asset['tag']}.png"))
