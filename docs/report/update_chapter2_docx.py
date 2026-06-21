from __future__ import annotations

import html
import shutil
import zipfile
from pathlib import Path

SRC = Path("docs/report/To_nhiem_vu_va_chuong_1_2_Lutest_TLX_chuong_2_co_anh.docx")
OUT = Path("docs/report/To_nhiem_vu_va_chuong_1_2_Lutest_TLX_chuong_2_cap_nhat_ly_thuyet.docx")


def esc(text: str) -> str:
    return html.escape(text, quote=False)


def run(text: str, bold: bool = False, size: int = 26) -> str:
    b = "<w:b/>" if bold else ""
    return (
        "<w:r>"
        f'<w:rPr>{b}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
        f'<w:t xml:space="preserve">{esc(text)}</w:t>'
        "</w:r>"
    )


def para(text: str = "", bold: bool = False, size: int = 26, align: str | None = None) -> str:
    jc = f'<w:jc w:val="{align}"/>' if align else ""
    return f"<w:p><w:pPr>{jc}</w:pPr>{run(text, bold=bold, size=size)}</w:p>"


def bullet(text: str) -> str:
    return para("• " + text)


replacement = "".join(
    [
        para("2.4. Playwright, DOM Geometry và cơ chế quét giao diện", bold=True, size=28),
        para(
            "Playwright là thư viện tự động hóa trình duyệt được sử dụng làm nền tảng cho Scan Engine của Lutest/TLX. "
            "Công cụ dùng Playwright để mở website local, truy cập các route cần kiểm thử, thiết lập viewport, chụp screenshot, thu thập console error, network error và thông tin DOM trên từng trang."
        ),
        para(
            "Một phần quan trọng của quá trình quét là DOM Geometry. Mỗi phần tử giao diện có thể được đo bằng các thông tin như top, left, right, bottom, width và height thông qua bounding box. "
            "Các dữ liệu này giúp hệ thống đánh giá vị trí, kích thước và quan hệ không gian giữa các phần tử trên màn hình."
        ),
        para(
            "Dựa trên dữ liệu hình học của DOM, Lutest/TLX kiểm tra các lỗi giao diện cơ bản như phần tử tràn khỏi viewport, nội dung bị cắt, layout bị lệch, phần tử bị che khuất hoặc hiển thị sai trên các kích thước màn hình desktop, tablet và mobile."
        ),
        para(),
        para("2.5. Thuật toán AABB, overflow và kiểm tra màu sắc", bold=True, size=28),
        para(
            "AABB, viết tắt của Axis-Aligned Bounding Box, là phương pháp biểu diễn một phần tử bằng hình chữ nhật song song với hai trục X và Y. "
            "Trong kiểm thử giao diện, mỗi phần tử DOM được xem như một bounding box. Hai phần tử được xem là giao nhau khi các cạnh của chúng thỏa điều kiện: A.left < B.right, A.right > B.left, A.top < B.bottom và A.bottom > B.top."
        ),
        para(
            "Lutest/TLX sử dụng ý tưởng AABB để phát hiện các trường hợp chồng lấn giao diện như text bị đè, button bị che hoặc card layout chồng lên nhau. "
            "Tuy nhiên, không phải mọi giao nhau đều là lỗi, vì các thành phần như modal, dropdown hoặc tooltip có thể chồng lớp theo thiết kế. Vì vậy hệ thống cần kết hợp thêm z-index, position, visibility và ngữ cảnh phần tử để giảm false positive."
        ),
        para(
            "Với lỗi overflow và text clipping, hệ thống có thể so sánh các thuộc tính như scrollWidth với clientWidth, scrollHeight với clientHeight, hoặc kiểm tra việc phần tử vượt ra ngoài kích thước viewport. "
            "Các dấu hiệu như overflow: hidden, white-space: nowrap và text-overflow: ellipsis cũng được dùng để nhận biết trường hợp nội dung bị cắt hoặc không hiển thị đầy đủ."
        ),
        para(
            "Đối với màu sắc, Lutest/TLX dựa trên nguyên tắc kiểm tra độ tương phản theo WCAG để đánh giá khả năng đọc giữa màu chữ và màu nền. "
            "Tỷ lệ tương phản thường được tính theo công thức (L1 + 0.05) / (L2 + 0.05), trong đó L1 và L2 là độ sáng tương đối của hai màu. Văn bản thông thường nên đạt tối thiểu khoảng 4.5:1 để đảm bảo khả năng đọc."
        ),
        para(
            "Ngoài RGB, HEX hoặc HSL, hệ thống và dashboard có thể tham khảo không gian màu OKLCH. OKLCH gồm Lightness, Chroma và Hue, cho phép biểu diễn màu gần hơn với cảm nhận thị giác của con người. "
            "Việc dùng OKLCH hữu ích khi thiết kế bảng màu severity cho báo cáo như Critical, Warning, Info và Success, giúp màu cảnh báo rõ ràng, nhất quán và dễ đọc hơn."
        ),
        para(),
        para("2.6. Project Graph, Dashboard Frontend và báo cáo local", bold=True, size=28),
        para(
            "Project Graph là mô hình biểu diễn cấu trúc dự án web bằng node và edge. Node có thể là page, route, component, API endpoint hoặc asset; edge thể hiện quan hệ import, render, gọi API hoặc phụ thuộc dữ liệu. "
            "Graph giúp hệ thống hiểu tổng quan dự án và xác định phạm vi ảnh hưởng khi mã nguồn thay đổi."
        ),
        para(
            "Trong Lutest/TLX, Project Graph được xây dựng bằng Node.js và TypeScript ở phía Worker Backend. Dữ liệu graph được chuẩn hóa thành JSON và cung cấp cho dashboard thông qua Express.js API. "
            "Cách tổ chức này giúp frontend và backend dùng chung schema, giảm lỗi khi trao đổi dữ liệu."
        ),
        para(
            "Dashboard Frontend được xây dựng bằng React, Vite và TypeScript. React hỗ trợ xây dựng giao diện theo component; Vite giúp phát triển nhanh nhờ dev server và hot reload; TypeScript giúp kiểm soát kiểu dữ liệu khi dashboard nhận project graph, report và danh sách lỗi từ Express Worker."
        ),
        para(
            "Kết quả kiểm thử được lưu local trong thư mục .tlx/ gồm report JSON, graph snapshot, screenshot và log. Screenshot đóng vai trò bằng chứng trực quan cho lỗi, giúp người dùng xem lại vị trí lỗi trên giao diện thay vì chỉ đọc mô tả văn bản."
        ),
        para(),
        para("2.7. Bảo mật, phân quyền và tích hợp phát triển", bold=True, size=28),
        para(
            "Do công cụ có khả năng đọc thông tin dự án và lưu ảnh giao diện, bảo mật và quyền riêng tư là yêu cầu quan trọng. Ở chế độ local, dữ liệu không nên tự động gửi ra ngoài nếu người dùng chưa cho phép. Khi đồng bộ cloud, hệ thống cần xác thực người dùng, bảo vệ API token, phân quyền theo vai trò như Owner, Admin, Member, Viewer và kiểm soát quyền truy cập báo cáo."
        ),
        para(
            "Trong định hướng hoàn chỉnh, Lutest/TLX có thể tích hợp CI/CD để chạy kiểm thử giao diện sau mỗi pull request hoặc trước khi triển khai. Kết quả scan có thể được xuất ra JSON/HTML hoặc gửi lên cloud, giúp nhóm phát triển phát hiện lỗi giao diện sớm, theo dõi lịch sử chất lượng sản phẩm và đặt ngưỡng cảnh báo khi số lỗi vượt mức cho phép."
        ),
    ]
)

with zipfile.ZipFile(SRC, "r") as zin:
    xml = zin.read("word/document.xml").decode("utf-8")
    start = xml.index("<w:t xml:space=\"preserve\">2.4. Playwright")
    para_start = xml.rfind("<w:p>", 0, start)
    end_marker = "<w:t xml:space=\"preserve\">2.6. Bảo mật"
    end_text = xml.index(end_marker)
    # keep replacing through the end of old 2.6 section, before sectPr
    sect = xml.index("<w:sectPr>", end_text)
    para_end = xml.rfind("</w:p>", 0, sect) + len("</w:p>")
    new_xml = xml[:para_start] + replacement + xml[para_end:]

    with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = new_xml.encode("utf-8")
            zout.writestr(item, data)

print(OUT)