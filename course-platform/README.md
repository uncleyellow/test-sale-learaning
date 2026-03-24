# Driving School Platform

Website trung tam day bang lai xe voi landing page, form dang ky, login theo role, thi ly thuyet online, dashboard admin, song ngu VI/EN, SEO co ban va luu tru qua Google Sheets Apps Script Web App.

## Chay local

1. Di vao thu muc `course-platform`
2. Tao file `server/.env` tu `server/.env.example`
3. Cai dependencies:

```powershell
npm.cmd install
```

4. Chay server:

```powershell
npm.cmd run dev
```

5. Mo `http://localhost:5000`

## Tai khoan mau khi `USE_MOCK_DATA=true`

- Admin: `admin@drivingschool.vn` / `Admin@123`
- Student: `student@drivingschool.vn` / `Student@123`

## Kien truc

- `client/public`: HTML pages
- `client/src/css`: Bootstrap customization
- `client/src/js`: Vanilla JS modules
- `client/src/i18n`: JSON da ngon ngu
- `server/src`: Express API + auth + Apps Script gateway
- `apps-script`: Code.gs va cau hinh Google Sheets

## Google Sheets setup

Ban co 2 cach:

1. Nhanh nhat: mo spreadsheet moi, vao `Extensions -> Apps Script`, copy `apps-script/Code.gs` va `apps-script/Setup.gs`, sau do chay `setupDrivingSchoolSheets()` va `seedDrivingSchoolDemoData()`.
2. Tao thu cong cac tab va header theo file [sheet-config.json](/d:/Desktop/New%20folder/course-platform/apps-script/sheet-config.json).

Du lieu mau chi tiet nam trong [seed-data.json](/d:/Desktop/New%20folder/course-platform/apps-script/seed-data.json).

## Apps Script deploy

1. Mo spreadsheet -> `Extensions` -> `Apps Script`
2. Copy noi dung tu [Code.gs](/d:/Desktop/New%20folder/course-platform/apps-script/Code.gs) va [Setup.gs](/d:/Desktop/New%20folder/course-platform/apps-script/Setup.gs)
3. Thay `SHARED_SECRET`
4. Chay `setupDrivingSchoolSheets()` de tao tab + header
5. Chay `seedDrivingSchoolDemoData()` neu ban muon nap demo data
6. Deploy `Web app`
7. Dien URL vao `APPS_SCRIPT_URL`
8. Dien secret vao `APPS_SCRIPT_SECRET`
9. Dat `USE_MOCK_DATA=false`

## Ghi chu

- Ban dev se chay ngon ngay ca khi chua noi Google Sheets nho mock mode.
- Auth dung JWT va `httpOnly cookie`.
- Song ngu dung query `?lang=vi` va `?lang=en`.
- Seed hien tai da kem san password hash hop le cho `Admin@123` va `Student@123`, nen sau khi chay `seedDrivingSchoolDemoData()` ban co the dang nhap ngay.
- Sheet `questions` can co cot `explanation` de hoc vien xem lai giai thich sau khi nop bai.
- Hoc vien khong tu dang ky tai khoan. Admin tao tai khoan hoc vien trong dashboard sau khi nhan form tu van.
