PHAD MOTORRAD SYSTEM — FRONTEND
================================

ไฟล์ในแพ็กเกจ
-------------
index.html
styles.css
app.js
config.js
README_TH.txt

วิธีตั้งค่า API
---------------
1. แตกไฟล์ ZIP
2. เปิด config.js ด้วย Notepad
3. คัดลอก Google Apps Script Web App URL แบบเต็ม
4. URL ต้องลงท้ายด้วย /exec
5. แทนที่ข้อความ:
   PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE
6. บันทึกไฟล์

วิธีอัปโหลดเข้า GitHub
----------------------
1. เข้า Repository phadmotorrad-system
2. เลือก Add file > Upload files
3. แตก ZIP ก่อน
4. เลือกไฟล์ทั้ง 5 ไฟล์ แล้วลากใส่ GitHub
5. ห้ามอัปโหลด ZIP ทั้งก้อนเข้า Repository
6. กด Commit changes

วิธีเชื่อม Cloudflare
---------------------
1. Cloudflare > Workers & Pages
2. Create application
3. Connect GitHub
4. เลือก Repository phadmotorrad-system
5. Framework preset: None
6. Build command: เว้นว่าง
7. Build output directory: /
8. Deploy

หมายเหตุ
--------
เวอร์ชันนี้มี Dashboard และโครงหน้าสำหรับ Customers, Vehicles,
Inventory, Orders, Invoices และ Settings

ตอนนี้เชื่อม API health check ได้แล้ว
ฟังก์ชัน CRUD ต้องเชื่อม endpoint ของ Google Apps Script เพิ่มภายหลัง
