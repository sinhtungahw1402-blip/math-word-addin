import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { MathfieldElement } from 'mathlive';
import {
  Card,
  CardHeader,
  Text,
  Button,
  Input,
  Textarea,
  Field,
  Badge,
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
  makeStyles,
  shorthands,
  tokens,
  Tooltip
} from '@fluentui/react-components';
import {
  MathFormula24Regular,
  Add20Regular,
  Delete20Regular,
  Copy20Regular,
  Checkmark20Regular,
  ArrowUndo20Regular,
  ArrowRedo20Regular,
  CursorClick20Regular,
  Search20Regular
} from '@fluentui/react-icons';
import { insertMathEquation, latexToMathML } from '../services/wordService';

// Configure MathLive fonts directory to use bundled offline fonts in /fonts
if (typeof window !== 'undefined') {
  try {
    MathfieldElement.fontsDirectory = '/fonts';
  } catch {
    // ignore if already configured
  }
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    ...shorthands.gap('12px'),
    ...shorthands.padding('4px')
  },
  categoryNav: {
    marginBottom: '8px',
    overflowX: 'auto',
    whiteSpace: 'nowrap'
  },
  searchRow: {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px')
  },
  paletteGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))',
    ...shorthands.gap('6px'),
    marginBottom: '10px',
    maxHeight: '260px',
    overflowY: 'auto',
    ...shorthands.padding('4px')
  },
  mathButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    ...shorthands.padding('4px 8px'),
    backgroundColor: '#ffffff',
    ...shorthands.border('1px', 'solid', '#d1d1d1'),
    ...shorthands.borderRadius('4px'),
    cursor: 'pointer',
    userSelect: 'none',
    overflow: 'hidden',
    transitionProperty: 'all',
    transitionDuration: '150ms',
    ':hover': {
      backgroundColor: '#f0f6ff',
      ...shorthands.borderColor('#0f6cbd'),
      transform: 'scale(1.02)'
    },
    ':active': {
      backgroundColor: '#e0edfe',
      transform: 'scale(0.98)'
    }
  },
  editorBoxWrapper: {
    backgroundColor: '#ffffff',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('2px', 'solid', '#0f6cbd'),
    boxShadow: '0 2px 8px rgba(15, 108, 189, 0.12)',
    overflow: 'hidden',
    transitionProperty: 'border-color, box-shadow',
    transitionDuration: '200ms',
    ':focus-within': {
      ...shorthands.borderColor('#115ea3'),
      boxShadow: '0 0 0 3px rgba(15, 108, 189, 0.25)'
    }
  },
  editorBoxHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shorthands.padding('6px 12px'),
    backgroundColor: '#f5f9ff',
    ...shorthands.borderBottom('1px', 'solid', '#e0e9f6')
  },
  mathfieldMount: {
    minHeight: '85px',
    ...shorthands.padding('12px 16px'),
    display: 'flex',
    alignItems: 'center',
    cursor: 'text',
    fontSize: '22px',
    lineHeight: '1.4'
  },
  quickPresetsRow: {
    display: 'flex',
    ...shorthands.gap('6px'),
    flexWrap: 'wrap',
    marginTop: '6px',
    maxHeight: '100px',
    overflowY: 'auto'
  },
  actions: {
    display: 'flex',
    ...shorthands.gap('8px'),
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '6px'
  }
});

interface MathTemplate {
  name: string;
  latex: string;
  preview: string;
  tags?: string;
}

const CATEGORIES = [
  { id: 'fractions', label: 'Phân số & Căn' },
  { id: 'scripts', label: 'Mũ & Chỉ số' },
  { id: 'brackets', label: 'Ngoặc & Hệ PT' },
  { id: 'calculus', label: 'Tích phân & Đạo hàm' },
  { id: 'limits', label: 'Tổng, Tích & Giới hạn' },
  { id: 'trig', label: 'Lượng giác & Logarit' },
  { id: 'vectors', label: 'Hình học & Vectơ' },
  { id: 'matrix', label: 'Ma trận & Định thức' },
  { id: 'accents', label: 'Dấu mũ & Phủ định' },
  { id: 'symbols', label: 'Toán tử & So sánh' },
  { id: 'logic_sets', label: 'Tập hợp & Logic' },
  { id: 'greek_lower', label: 'Hy Lạp (Thường)' },
  { id: 'greek_upper', label: 'Hy Lạp (Hoa)' }
];

const TEMPLATES_BY_CAT: Record<string, MathTemplate[]> = {
  fractions: [
    { name: 'Phân số chuẩn', latex: '\\frac{a}{b}', preview: '\\frac{a}{b}', tags: 'phan so chia fraction' },
    { name: 'Phân số xiên', latex: 'a/b', preview: 'a/b', tags: 'phan so xien slash' },
    { name: 'Phân số nhỏ', latex: '\\tfrac{a}{b}', preview: '\\tfrac{a}{b}', tags: 'phan so nho inline' },
    { name: 'Phân số vi phân', latex: '\\frac{dy}{dx}', preview: '\\frac{dy}{dx}', tags: 'dao ham vi phan' },
    { name: 'Phân số vi phân cấp 2', latex: '\\frac{d^2y}{dx^2}', preview: '\\frac{d^2y}{dx^2}', tags: 'dao ham cap 2' },
    { name: 'Đạo hàm riêng', latex: '\\frac{\\partial z}{\\partial x}', preview: '\\frac{\\partial z}{\\partial x}', tags: 'dao ham rieng partial' },
    { name: 'Đạo hàm riêng cấp 2', latex: '\\frac{\\partial^2 z}{\\partial x^2}', preview: '\\frac{\\partial^2 z}{\\partial x^2}', tags: 'dao ham rieng cap 2' },
    { name: 'Đạo hàm riêng hỗn hợp', latex: '\\frac{\\partial^2 z}{\\partial x \\partial y}', preview: '\\frac{\\partial^2 z}{\\partial x \\partial y}', tags: 'dao ham hon hop' },
    { name: 'Căn bậc hai', latex: '\\sqrt{x}', preview: '\\sqrt{x}', tags: 'can bac hai square root' },
    { name: 'Căn bậc n', latex: '\\sqrt[n]{x}', preview: '\\sqrt[n]{x}', tags: 'can bac n root' },
    { name: 'Căn bậc ba', latex: '\\sqrt[3]{x}', preview: '\\sqrt[3]{x}', tags: 'can bac ba cube root' },
    { name: 'Căn bậc bốn', latex: '\\sqrt[4]{x}', preview: '\\sqrt[4]{x}', tags: 'can bac bon' },
    { name: 'Căn tam thức', latex: '\\sqrt{a^2 + b^2}', preview: '\\sqrt{a^2 + b^2}', tags: 'can tam thuc pythagore' },
    { name: 'Căn phân số', latex: '\\sqrt{\\frac{a}{b}}', preview: '\\sqrt{\\frac{a}{b}}', tags: 'can phan so' },
    { name: 'Nghiệm PT bậc hai', latex: '\\frac{-b \\pm \\sqrt{\\Delta}}{2a}', preview: '\\frac{-b \\pm \\sqrt{\\Delta}}{2a}', tags: 'nghiem pt bac 2 delta' },
    { name: 'Căn lồng căn', latex: '\\sqrt{x + \\sqrt{x}}', preview: '\\sqrt{x + \\sqrt{x}}', tags: 'can long can nested' },
    { name: 'Liên phân số', latex: '\\frac{1}{1 + \\frac{1}{x}}', preview: '\\frac{1}{1 + \\frac{1}{x}}', tags: 'lien phan so tang' },
    { name: 'Căn hiệu bình phương', latex: '\\sqrt{x^2 - a^2}', preview: '\\sqrt{x^2 - a^2}', tags: 'can hieu' },
    { name: 'Căn bậc 3 tam thức', latex: '\\sqrt[3]{a^3 + b^3}', preview: '\\sqrt[3]{a^3 + b^3}', tags: 'can bac 3' },
    { name: 'Tỷ sai delta', latex: '\\frac{\\Delta y}{\\Delta x}', preview: '\\frac{\\Delta y}{\\Delta x}', tags: 'delta y delta x' }
  ],
  scripts: [
    { name: 'Số mũ trên', latex: 'x^{2}', preview: 'x^{2}', tags: 'so mu tren power square' },
    { name: 'Mũ bậc 3', latex: 'x^{3}', preview: 'x^{3}', tags: 'so mu 3 lap phuong' },
    { name: 'Mũ bậc n', latex: 'x^{n}', preview: 'x^{n}', tags: 'so mu n' },
    { name: 'Chỉ số dưới', latex: 'x_{i}', preview: 'x_{i}', tags: 'chi so duoi subscript' },
    { name: 'Chỉ số 0', latex: 'x_{0}', preview: 'x_{0}', tags: 'x0' },
    { name: 'Chỉ số 1', latex: 'x_{1}', preview: 'x_{1}', tags: 'x1' },
    { name: 'Chỉ số n', latex: 'x_{n}', preview: 'x_{n}', tags: 'xn' },
    { name: 'Cả trên & dưới', latex: 'x_{i}^{2}', preview: 'x_{i}^{2}', tags: 'ca tren va duoi' },
    { name: 'Tổ hợp C_n^k', latex: 'C_{n}^{k}', preview: 'C_{n}^{k}', tags: 'to hop cnk' },
    { name: 'Chỉnh hợp A_n^k', latex: 'A_{n}^{k}', preview: 'A_{n}^{k}', tags: 'chinh hop ank' },
    { name: 'Mũ âm', latex: 'e^{-x}', preview: 'e^{-x}', tags: 'mu am' },
    { name: 'Số mũ phân số', latex: 'x^{\\frac{m}{n}}', preview: 'x^{\\frac{m}{n}}', tags: 'mu phan so' },
    { name: 'Số mũ âm 1', latex: 'x^{-1}', preview: 'x^{-1}', tags: 'nghich dao mu am 1' },
    { name: 'Tháp mũ', latex: 'x^{a^b}', preview: 'x^{a^b}', tags: 'thap mu tower' },
    { name: 'Chỉ số ma trận a_ij', latex: 'a_{ij}', preview: 'a_{ij}', tags: 'chi so i j' },
    { name: 'Chỉ số bên trái', latex: '{}_{n}^{k} C', preview: '{}_{n}^{k} C}', tags: 'chi so trai' },
    { name: 'Cực đại x_max', latex: 'x_{\\max}', preview: 'x_{\\max}', tags: 'x max' },
    { name: 'Cực tiểu x_min', latex: 'x_{\\min}', preview: 'x_{\\min}', tags: 'x min' },
    { name: 'Cực đại CD', latex: 'y_{\\text{CĐ}}', preview: 'y_{\\text{CĐ}}', tags: 'cuc dai' },
    { name: 'Cực tiểu CT', latex: 'y_{\\text{CT}}', preview: 'y_{\\text{CT}}', tags: 'cuc tieu' }
  ],
  brackets: [
    { name: 'Ngoặc tròn', latex: '\\left( x + 1 \\right)', preview: '(x+1)', tags: 'ngoac tron parentheses' },
    { name: 'Ngoặc vuông (đoạn)', latex: '\\left[ a; b \\right]', preview: '[a;b]', tags: 'ngoac vuong doan brackets' },
    { name: 'Nửa khoảng trái', latex: '\\left[ a; b \\right)', preview: '[a;b)', tags: 'nua khoang' },
    { name: 'Nửa khoảng phải', latex: '\\left( a; b \\right]', preview: '(a;b]', tags: 'nua khoang' },
    { name: 'Ngoặc nhọn tập hợp', latex: '\\left\\{ x \\in \\mathbb{R} \\mid x > 0 \\right\\}', preview: '\\{x > 0\\}', tags: 'ngoac nhon tap hop' },
    { name: 'Trị tuyệt đối', latex: '\\left| x^2 - 4 \\right|', preview: '|x^2-4|', tags: 'tri tuyet doi' },
    { name: 'Chuẩn / Độ dài vectơ', latex: '\\left\\| \\vec{u} \\right\\|', preview: '\\|\\vec{u}\\|', tags: 'chuan do dai norm' },
    {
      name: 'Hệ 2 phương trình',
      latex: '\\begin{cases} a_1 x + b_1 y = c_1 \\\\ a_2 x + b_2 y = c_2 \\end{cases}',
      preview: '\\begin{cases} ax+b \\\\ cx+d \\end{cases}',
      tags: 'he 2 phuong trinh'
    },
    {
      name: 'Hệ 3 phương trình',
      latex: '\\begin{cases} x + y + z = 6 \\\\ 2x - y + z = 3 \\\\ x + 2y - z = 2 \\end{cases}',
      preview: '\\begin{cases} x \\\\ y \\\\ z \\end{cases}',
      tags: 'he 3 phuong trinh'
    },
    {
      name: 'Hệ bất phương trình',
      latex: '\\begin{cases} 2x - y > 0 \\\\ x + 3y \\le 5 \\end{cases}',
      preview: '\\begin{cases} >0 \\\\ \\le 5 \\end{cases}',
      tags: 'he bat phuong trinh'
    },
    {
      name: 'Dấu hoặc (tuyển 2 nghiệm)',
      latex: '\\left[ \\begin{matrix} x = a \\\\ x = b \\end{matrix} \\right.',
      preview: '\\left[\\begin{matrix} a \\\\ b \\end{matrix}\\right.',
      tags: 'dau hoac tuyen'
    },
    {
      name: 'Dấu hoặc (tuyển 3 nghiệm)',
      latex: '\\left[ \\begin{matrix} x = 1 \\\\ x = -2 \\\\ x = 0 \\end{matrix} \\right.',
      preview: '\\left[\\begin{matrix} 1 \\\\ -2 \\\\ 0 \\end{matrix}\\right.',
      tags: 'dau hoac 3 nghiem'
    },
    {
      name: 'Hàm từng khúc (Piecewise)',
      latex: 'f(x) = \\begin{cases} x^2 & \\text{khi } x \\ge 0 \\\\ -x & \\text{khi } x < 0 \\end{cases}',
      preview: 'f(x)=\\begin{cases} x^2 \\\\ -x \\end{cases}',
      tags: 'ham tung khuc piecewise'
    },
    { name: 'Góc giữa 2 vectơ', latex: '\\left( \\vec{u}, \\vec{v} \\right)', preview: '(\\vec{u}, \\vec{v})', tags: 'goc giua 2 vecto' },
    { name: 'Cặp tọa độ (x; y)', latex: '\\left( x; y \\right)', preview: '(x;y)', tags: 'toa do oxy' },
    { name: 'Bộ 3 tọa độ (x; y; z)', latex: '\\left( x; y; z \\right)', preview: '(x;y;z)', tags: 'toa do oxyz' }
  ],
  calculus: [
    { name: 'Tích phân bất định', latex: '\\int f(x) \\, dx', preview: '\\int f(x) \\, dx', tags: 'tich phan bat dinh nguyen ham' },
    { name: 'Tích phân xác định', latex: '\\int_{a}^{b} f(x) \\, dx', preview: '\\int_{a}^{b} f(x) \\, dx', tags: 'tich phan xac dinh can' },
    { name: 'Tích phân 2 lớp', latex: '\\iint_{D} f(x, y) \\, dx dy', preview: '\\iint_{D} f(x,y)', tags: 'tich phan 2 lop boi' },
    { name: 'Tích phân 3 lớp', latex: '\\iiint_{V} f(x, y, z) \\, dx dy dz', preview: '\\iiint_{V} f', tags: 'tich phan 3 lop boi' },
    { name: 'Tích phân đường kín', latex: '\\oint_{C} f(s) \\, ds', preview: '\\oint_{C} f(s)ds', tags: 'tich phan duong mat kin' },
    { name: 'Thế cận Newton-Leibniz', latex: '\\left. F(x) \\right|_{a}^{b}', preview: '\\left. F(x) \\right|_{a}^{b}', tags: 'the can newton leibniz' },
    { name: 'Thế cận ngoặc vuông', latex: '\\left[ F(x) \\right]_{a}^{b}', preview: '\\left[ F(x) \\right]_{a}^{b}', tags: 'the can ngoac vuong' },
    { name: 'Đạo hàm y\'', latex: 'y\' = f\'(x)', preview: 'y\'', tags: 'dao ham cap 1' },
    { name: 'Đạo hàm cấp 2', latex: 'y\'\' = f\'\'(x)', preview: 'y\'\'', tags: 'dao ham cap 2' },
    { name: 'Đạo hàm cấp n', latex: 'y^{(n)}', preview: 'y^{(n)}', tags: 'dao ham cap n' },
    { name: 'Đạo hàm tại điểm x0', latex: 'f\'(x_0)', preview: 'f\'(x_0)', tags: 'dao ham tai x0' },
    { name: 'Vi phân dy', latex: 'dy = f\'(x) \\, dx', preview: 'dy = f\'(x)dx', tags: 'vi phan' },
    { name: 'Tích phân từng phần', latex: '\\int u \\, dv = uv - \\int v \\, du', preview: 'uv - \\int v du', tags: 'tich phan tung phan' },
    { name: 'Diện tích hình phẳng', latex: 'S = \\int_{a}^{b} |f(x) - g(x)| \\, dx', preview: 'S = \\int |f-g|', tags: 'dien tich hinh phang' },
    { name: 'Thể tích tròn xoay', latex: 'V = \\pi \\int_{a}^{b} [f(x)]^2 \\, dx', preview: 'V = \\pi \\int f^2', tags: 'the tich tron xoay' },
    { name: 'Độ dài cung cong', latex: 'L = \\int_{a}^{b} \\sqrt{1 + [f\'(x)]^2} \\, dx', preview: 'L = \\int \\sqrt{1+y\'^2}', tags: 'do dai cung' }
  ],
  limits: [
    { name: 'Tổng xích-ma i=1..n', latex: '\\sum_{i=1}^{n} x_i', preview: '\\sum_{i=1}^{n} x_i', tags: 'tong xich ma sigma' },
    { name: 'Tổng k=0..n', latex: '\\sum_{k=0}^{n} C_n^k a^{n-k} b^k', preview: '\\sum_{k=0}^{n} C_n^k', tags: 'nhi thuc newton tong' },
    { name: 'Chuỗi vô hạn', latex: '\\sum_{n=1}^{\\infty} \\frac{1}{n^2}', preview: '\\sum_{n=1}^{\\infty}', tags: 'chuoi vo han' },
    { name: 'Tích Pi', latex: '\\prod_{i=1}^{n} a_i', preview: '\\prod_{i=1}^{n} a_i', tags: 'tich pi product' },
    { name: 'Giới hạn x -> x0', latex: '\\lim_{x \\to x_0} f(x)', preview: '\\lim_{x \\to x_0} f(x)', tags: 'gioi han limit x0' },
    { name: 'Giới hạn x -> +vô cực', latex: '\\lim_{x \\to +\\infty} f(x)', preview: '\\lim_{x \\to +\\infty}', tags: 'gioi han vo cuc duong' },
    { name: 'Giới hạn x -> -vô cực', latex: '\\lim_{x \\to -\\infty} f(x)', preview: '\\lim_{x \\to -\\infty}', tags: 'gioi han vo cuc am' },
    { name: 'Giới hạn bên phải', latex: '\\lim_{x \\to x_0^+} f(x)', preview: '\\lim_{x \\to x_0^+}', tags: 'gioi han ben phai 1 ben' },
    { name: 'Giới hạn bên trái', latex: '\\lim_{x \\to x_0^-} f(x)', preview: '\\lim_{x \\to x_0^-}', tags: 'gioi han ben trai 1 ben' },
    { name: 'Giới hạn dãy số u_n', latex: '\\lim_{n \\to \\infty} u_n', preview: '\\lim u_n', tags: 'gioi han day so' },
    { name: 'Giới hạn số e', latex: '\\lim_{x \\to 0} (1 + x)^{\\frac{1}{x}} = e', preview: '\\lim (1+x)^{1/x}', tags: 'gioi han e' },
    { name: 'Hợp các tập hợp', latex: '\\bigcup_{i=1}^{n} A_i', preview: '\\bigcup_{i=1}^{n}', tags: 'hop vo han union' },
    { name: 'Giao các tập hợp', latex: '\\bigcap_{i=1}^{n} A_i', preview: '\\bigcap_{i=1}^{n}', tags: 'giao vo han intersection' },
    { name: 'Giá trị lớn nhất max', latex: '\\max_{x \\in [a; b]} f(x)', preview: '\\max f(x)', tags: 'gia tri lon nhat max' },
    { name: 'Giá trị nhỏ nhất min', latex: '\\min_{x \\in [a; b]} f(x)', preview: '\\min f(x)', tags: 'gia tri nho nhat min' }
  ],
  trig: [
    { name: 'Sin x', latex: '\\sin x', preview: '\\sin x', tags: 'sin' },
    { name: 'Cos x', latex: '\\cos x', preview: '\\cos x', tags: 'cos' },
    { name: 'Tan x', latex: '\\tan x', preview: '\\tan x', tags: 'tan' },
    { name: 'Cot x', latex: '\\cot x', preview: '\\cot x', tags: 'cot cotan' },
    { name: 'Hằng đẳng thức Sin Cos', latex: '\\sin^2 x + \\cos^2 x = 1', preview: '\\sin^2 x + \\cos^2 x', tags: 'sin2 cos2' },
    { name: 'Hằng đẳng thức Tan', latex: '1 + \\tan^2 x = \\frac{1}{\\cos^2 x}', preview: '1+\\tan^2 x', tags: '1 tan2' },
    { name: 'Sin nhân đôi', latex: '\\sin 2x = 2\\sin x \\cos x', preview: '\\sin 2x', tags: 'sin 2x' },
    { name: 'Cos nhân đôi', latex: '\\cos 2x = \\cos^2 x - \\sin^2 x', preview: '\\cos 2x', tags: 'cos 2x' },
    { name: 'Tan nhân đôi', latex: '\\tan 2x = \\frac{2\\tan x}{1 - \\tan^2 x}', preview: '\\tan 2x', tags: 'tan 2x' },
    { name: 'Sin nhân ba', latex: '\\sin 3x = 3\\sin x - 4\\sin^3 x', preview: '\\sin 3x', tags: 'sin 3x' },
    { name: 'Cos nhân ba', latex: '\\cos 3x = 4\\cos^3 x - 3\\cos x', preview: '\\cos 3x', tags: 'cos 3x' },
    { name: 'Lượng giác cộng', latex: '\\sin(a + b) = \\sin a \\cos b + \\cos a \\sin b', preview: '\\sin(a+b)', tags: 'cong luong giac' },
    { name: 'Lượng giác ngược arcsin', latex: '\\arcsin x', preview: '\\arcsin x', tags: 'arcsin' },
    { name: 'Lượng giác ngược arccos', latex: '\\arccos x', preview: '\\arccos x', tags: 'arccos' },
    { name: 'Lượng giác ngược arctan', latex: '\\arctan x', preview: '\\arctan x', tags: 'arctan' },
    { name: 'Logarit cơ số a', latex: '\\log_{a} b', preview: '\\log_{a} b', tags: 'logarit log' },
    { name: 'Logarit tự nhiên ln', latex: '\\ln x', preview: '\\ln x', tags: 'ln logarit tu nhien' },
    { name: 'Logarit thập phân lg', latex: '\\lg x', preview: '\\lg x', tags: 'log thap phan' },
    { name: 'Logarit tích', latex: '\\log_a(x \\cdot y) = \\log_a x + \\log_a y', preview: '\\log(xy)', tags: 'log tich' },
    { name: 'Logarit thương', latex: '\\log_a\\left(\\frac{x}{y}\\right) = \\log_a x - \\log_a y', preview: '\\log(x/y)', tags: 'log thuong' }
  ],
  vectors: [
    { name: 'Vectơ u', latex: '\\vec{u}', preview: '\\vec{u}', tags: 'vecto u' },
    { name: 'Vectơ v', latex: '\\vec{v}', preview: '\\vec{v}', tags: 'vecto v' },
    { name: 'Vectơ không', latex: '\\vec{0}', preview: '\\vec{0}', tags: 'vecto 0' },
    { name: 'Vectơ đơn vị i', latex: '\\vec{i}', preview: '\\vec{i}', tags: 'vecto i' },
    { name: 'Vectơ đơn vị j', latex: '\\vec{j}', preview: '\\vec{j}', tags: 'vecto j' },
    { name: 'Vectơ đơn vị k', latex: '\\vec{k}', preview: '\\vec{k}', tags: 'vecto k' },
    { name: 'Vectơ AB', latex: '\\overrightarrow{AB}', preview: '\\overrightarrow{AB}', tags: 'vecto AB' },
    { name: 'Tọa độ vectơ', latex: '\\vec{u} = (x; y; z)', preview: '\\vec{u} = (x;y;z)', tags: 'toa do vecto' },
    { name: 'Tọa độ điểm M', latex: 'M(x_0; y_0; z_0)', preview: 'M(x_0; y_0)', tags: 'toa do diem' },
    { name: 'Tích vô hướng', latex: '\\vec{u} \\cdot \\vec{v}', preview: '\\vec{u} \\cdot \\vec{v}', tags: 'tich vo huong' },
    { name: 'Tích có hướng', latex: '[\\vec{u}, \\vec{v}]', preview: '[\\vec{u}, \\vec{v}]', tags: 'tich co huong cross' },
    { name: 'Độ dài vectơ', latex: '|\\vec{u}| = \\sqrt{x^2 + y^2 + z^2}', preview: '|\\vec{u}|', tags: 'do dai vecto norm' },
    { name: 'Góc tam giác', latex: '\\widehat{ABC}', preview: '\\widehat{ABC}', tags: 'goc hat' },
    { name: 'Ký hiệu góc', latex: '\\angle A', preview: '\\angle A', tags: 'goc angle' },
    { name: 'Tam giác ABC', latex: '\\triangle ABC', preview: '\\triangle ABC', tags: 'tam giac triangle' },
    { name: 'Song song', latex: 'a \\parallel b', preview: 'a \\parallel b', tags: 'song song parallel' },
    { name: 'Vuông góc', latex: 'a \\perp (P)', preview: 'a \\perp (P)', tags: 'vuong goc perpendicular' },
    { name: 'Khoảng cách điểm-mp', latex: 'd(M, (P))', preview: 'd(M, (P))', tags: 'khoang cach distance' },
    { name: 'Ký hiệu độ', latex: '90^\\circ', preview: '90^\\circ', tags: 'do degree' },
    { name: 'Cung tròn', latex: '\\stackrel{\\frown}{AB}', preview: '\\stackrel{\\frown}{AB}', tags: 'cung tron arc' }
  ],
  matrix: [
    { name: 'Ma trận tròn 2x2', latex: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', preview: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}', tags: 'ma tran 2x2 pmatrix' },
    { name: 'Định thức 2x2', latex: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', preview: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}', tags: 'dinh thuc 2x2 det' },
    { name: 'Ma trận vuông 2x2', latex: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', preview: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}', tags: 'ma tran vuong 2x2 bmatrix' },
    { name: 'Ma trận tròn 3x3', latex: '\\begin{pmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{pmatrix}', preview: '\\begin{pmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{pmatrix}', tags: 'ma tran 3x3' },
    { name: 'Định thức 3x3', latex: '\\begin{vmatrix} a_{11} & a_{12} & a_{13} \\\\ a_{21} & a_{22} & a_{23} \\\\ a_{31} & a_{32} & a_{33} \\end{vmatrix}', preview: '\\begin{vmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{vmatrix}', tags: 'dinh thuc 3x3 det' },
    { name: 'Ma trận vuông 3x3', latex: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}', preview: '\\begin{bmatrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{bmatrix}', tags: 'ma tran vuong 3x3' },
    { name: 'Vectơ cột 2x1', latex: '\\begin{pmatrix} x \\\\ y \\end{pmatrix}', preview: '\\begin{pmatrix} x \\\\ y \\end{pmatrix}', tags: 'vecto cot 2x1' },
    { name: 'Vectơ cột 3x1', latex: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}', preview: '\\begin{pmatrix} x \\\\ y \\\\ z \\end{pmatrix}', tags: 'vecto cot 3x1' },
    { name: 'Vectơ hàng', latex: '\\begin{pmatrix} x & y & z \\end{pmatrix}', preview: '\\begin{pmatrix} x & y & z \\end{pmatrix}', tags: 'vecto hang' },
    { name: 'Ma trận đơn vị', latex: 'I_3 = \\begin{pmatrix} 1 & 0 & 0 \\\\ 0 & 1 & 0 \\\\ 0 & 0 & 1 \\end{pmatrix}', preview: 'I_3', tags: 'ma tran don vi identity' },
    { name: 'Ma trận chuyển vị', latex: 'A^T', preview: 'A^T', tags: 'chuyen vi transpose' },
    { name: 'Ma trận nghịch đảo', latex: 'A^{-1}', preview: 'A^{-1}', tags: 'nghich dao inverse' }
  ],
  accents: [
    { name: 'Vectơ trên đầu', latex: '\\vec{x}', preview: '\\vec{x}', tags: 'dau vecto tren dau' },
    { name: 'Vectơ 2 chữ', latex: '\\overrightarrow{AB}', preview: '\\overrightarrow{AB}', tags: 'vecto mui ten dai' },
    { name: 'Gạch trên đầu', latex: '\\bar{x}', preview: '\\bar{x}', tags: 'gach dau bar' },
    { name: 'Gạch dài trên đầu', latex: '\\overline{AB}', preview: '\\overline{AB}', tags: 'gach dai overline' },
    { name: 'Dấu mũ góc', latex: '\\hat{x}', preview: '\\hat{x}', tags: 'dau mu hat' },
    { name: 'Dấu chấm đạo hàm', latex: '\\dot{x}', preview: '\\dot{x}', tags: 'dau cham dot' },
    { name: 'Hai chấm đạo hàm', latex: '\\ddot{x}', preview: '\\ddot{x}', tags: 'hai cham ddot' },
    { name: 'Dấu ngã trên đầu', latex: '\\tilde{x}', preview: '\\tilde{x}', tags: 'dau nga tilde' },
    { name: 'Gạch chân dưới', latex: '\\underline{x}', preview: '\\underline{x}', tags: 'gach chan underline' },
    { name: 'Dấu ngoặc ôm trên', latex: '\\overbrace{a + b + \\dots + n}', preview: '\\overbrace{a+b}', tags: 'om tren overbrace' },
    { name: 'Dấu ngoặc ôm dưới', latex: '\\underbrace{a + b + \\dots + n}_{k \\text{ số}}', preview: '\\underbrace{a+b}', tags: 'om duoi underbrace' },
    { name: 'Cung trên đầu', latex: '\\overset{\\frown}{AB}', preview: '\\overset{\\frown}{AB}', tags: 'cung tron' }
  ],
  symbols: [
    { name: 'Cộng trừ', latex: '\\pm', preview: '\\pm', tags: 'cong tru plus minus' },
    { name: 'Trừ cộng', latex: '\\mp', preview: '\\mp', tags: 'tru cong minus plus' },
    { name: 'Nhân dấu chấm', latex: '\\cdot', preview: '\\cdot', tags: 'nhan cham cdot' },
    { name: 'Nhân dấu chéo', latex: '\\times', preview: '\\times', tags: 'nhan cheo times' },
    { name: 'Chia', latex: '\\div', preview: '\\div', tags: 'chia divide' },
    { name: 'Dấu sao', latex: '\\ast', preview: '\\ast', tags: 'dau sao ast' },
    { name: 'Bằng', latex: '=', preview: '=', tags: 'bang equal' },
    { name: 'Khác', latex: '\\ne', preview: '\\ne', tags: 'khac not equal' },
    { name: 'Nhỏ hơn', latex: '<', preview: '<', tags: 'nho hon less than' },
    { name: 'Lớn hơn', latex: '>', preview: '>', tags: 'lon hon greater than' },
    { name: 'Nhỏ hơn hoặc bằng', latex: '\\le', preview: '\\le', tags: 'nho hon bang le' },
    { name: 'Lớn hơn hoặc bằng', latex: '\\ge', preview: '\\ge', tags: 'lon hon bang ge' },
    { name: 'Xấp xỉ', latex: '\\approx', preview: '\\approx', tags: 'xap xi approx' },
    { name: 'Đồng dạng / Tương đương', latex: '\\sim', preview: '\\sim', tags: 'dong dang sim' },
    { name: 'Bằng nhau hình học', latex: '\\cong', preview: '\\cong', tags: 'bang nhau hinh hoc cong' },
    { name: 'Đồng nhất / Tương đương', latex: '\\equiv', preview: '\\equiv', tags: 'dong nhat equiv' },
    { name: 'Rất nhỏ hơn', latex: '\\ll', preview: '\\ll', tags: 'rat nho hon ll' },
    { name: 'Rất lớn hơn', latex: '\\gg', preview: '\\gg', tags: 'rat lon hon gg' },
    { name: 'Tỷ lệ thuận', latex: '\\propto', preview: '\\propto', tags: 'ty le thuan propto' },
    { name: 'Vô cực', latex: '\\infty', preview: '\\infty', tags: 'vo cuc vo cung infinity' },
    { name: 'Ba chấm ngang dưới', latex: '\\dots', preview: '\\dots', tags: 'ba cham dots' },
    { name: 'Ba chấm giữa', latex: '\\cdots', preview: '\\cdots', tags: 'ba cham giua cdots' },
    { name: 'Ba chấm đứng', latex: '\\vdots', preview: '\\vdots', tags: 'ba cham dung vdots' },
    { name: 'Ba chấm chéo', latex: '\\ddots', preview: '\\ddots', tags: 'ba cham cheo ddots' }
  ],
  logic_sets: [
    { name: 'Tập số tự nhiên N', latex: '\\mathbb{N}', preview: '\\mathbb{N}', tags: 'tap so tu nhien N' },
    { name: 'Tập N sao', latex: '\\mathbb{N}^*', preview: '\\mathbb{N}^*', tags: 'N sao' },
    { name: 'Tập số nguyên Z', latex: '\\mathbb{Z}', preview: '\\mathbb{Z}', tags: 'tap so nguyen Z' },
    { name: 'Tập số hữu tỉ Q', latex: '\\mathbb{Q}', preview: '\\mathbb{Q}', tags: 'tap so huu ti Q' },
    { name: 'Tập số thực R', latex: '\\mathbb{R}', preview: '\\mathbb{R}', tags: 'tap so thuc R' },
    { name: 'Tập số phức C', latex: '\\mathbb{C}', preview: '\\mathbb{C}', tags: 'tap so phuc C' },
    { name: 'Thuộc', latex: '\\in', preview: '\\in', tags: 'thuoc in' },
    { name: 'Không thuộc', latex: '\\notin', preview: '\\notin', tags: 'khong thuoc notin' },
    { name: 'Tập con', latex: '\\subset', preview: '\\subset', tags: 'tap con subset' },
    { name: 'Chứa tập', latex: '\\supset', preview: '\\supset', tags: 'chua supset' },
    { name: 'Tập con hoặc bằng', latex: '\\subseteq', preview: '\\subseteq', tags: 'tap con bang' },
    { name: 'Giao tập hợp', latex: '\\cap', preview: '\\cap', tags: 'giao cap' },
    { name: 'Hợp tập hợp', latex: '\\cup', preview: '\\cup', tags: 'hop cup' },
    { name: 'Hiệu tập hợp', latex: '\\setminus', preview: '\\setminus', tags: 'hieu tap hop setminus' },
    { name: 'Tập rỗng', latex: '\\emptyset', preview: '\\emptyset', tags: 'tap rong emptyset' },
    { name: 'Với mọi', latex: '\\forall', preview: '\\forall', tags: 'voi moi forall' },
    { name: 'Tồn tại', latex: '\\exists', preview: '\\exists', tags: 'ton tai exists' },
    { name: 'Không tồn tại', latex: '\\nexists', preview: '\\nexists', tags: 'khong ton tai nexists' },
    { name: 'Suy ra (kéo theo)', latex: '\\Rightarrow', preview: '\\Rightarrow', tags: 'suy ra implies' },
    { name: 'Tương đương', latex: '\\Leftrightarrow', preview: '\\Leftrightarrow', tags: 'tuong duong iff' },
    { name: 'Mệnh đề hội (Và)', latex: '\\wedge', preview: '\\wedge', tags: 'hoi va and wedge' },
    { name: 'Mệnh đề tuyển (Hoặc)', latex: '\\vee', preview: '\\vee', tags: 'tuyen hoac or vee' },
    { name: 'Phủ định', latex: '\\neg', preview: '\\neg', tags: 'phu dinh neg not' },
    { name: 'Ký hiệu ánh xạ', latex: 'f: X \\to Y', preview: 'f: X \\to Y', tags: 'anh xa to' }
  ],
  greek_lower: [
    { name: 'alpha', latex: '\\alpha', preview: '\\alpha', tags: 'alpha a' },
    { name: 'beta', latex: '\\beta', preview: '\\beta', tags: 'beta b' },
    { name: 'gamma', latex: '\\gamma', preview: '\\gamma', tags: 'gamma g' },
    { name: 'delta', latex: '\\delta', preview: '\\delta', tags: 'delta d' },
    { name: 'epsilon', latex: '\\epsilon', preview: '\\epsilon', tags: 'epsilon e' },
    { name: 'varepsilon', latex: '\\varepsilon', preview: '\\varepsilon', tags: 'varepsilon' },
    { name: 'zeta', latex: '\\zeta', preview: '\\zeta', tags: 'zeta z' },
    { name: 'eta', latex: '\\eta', preview: '\\eta', tags: 'eta' },
    { name: 'theta', latex: '\\theta', preview: '\\theta', tags: 'theta th' },
    { name: 'vartheta', latex: '\\vartheta', preview: '\\vartheta', tags: 'vartheta' },
    { name: 'iota', latex: '\\iota', preview: '\\iota', tags: 'iota i' },
    { name: 'kappa', latex: '\\kappa', preview: '\\kappa', tags: 'kappa k' },
    { name: 'lambda', latex: '\\lambda', preview: '\\lambda', tags: 'lambda l' },
    { name: 'mu', latex: '\\mu', preview: '\\mu', tags: 'mu m' },
    { name: 'nu', latex: '\\nu', preview: '\\nu', tags: 'nu n' },
    { name: 'xi', latex: '\\xi', preview: '\\xi', tags: 'xi x' },
    { name: 'pi', latex: '\\pi', preview: '\\pi', tags: 'pi' },
    { name: 'varpi', latex: '\\varpi', preview: '\\varpi', tags: 'varpi' },
    { name: 'rho', latex: '\\rho', preview: '\\rho', tags: 'rho r' },
    { name: 'varrho', latex: '\\varrho', preview: '\\varrho', tags: 'varrho' },
    { name: 'sigma', latex: '\\sigma', preview: '\\sigma', tags: 'sigma s' },
    { name: 'tau', latex: '\\tau', preview: '\\tau', tags: 'tau t' },
    { name: 'upsilon', latex: '\\upsilon', preview: '\\upsilon', tags: 'upsilon u' },
    { name: 'phi', latex: '\\phi', preview: '\\phi', tags: 'phi f' },
    { name: 'varphi', latex: '\\varphi', preview: '\\varphi', tags: 'varphi' },
    { name: 'chi', latex: '\\chi', preview: '\\chi', tags: 'chi ch' },
    { name: 'psi', latex: '\\psi', preview: '\\psi', tags: 'psi ps' },
    { name: 'omega', latex: '\\omega', preview: '\\omega', tags: 'omega w' }
  ],
  greek_upper: [
    { name: 'Gamma hoa', latex: '\\Gamma', preview: '\\Gamma', tags: 'Gamma hoa' },
    { name: 'Delta hoa', latex: '\\Delta', preview: '\\Delta', tags: 'Delta hoa tam giac' },
    { name: 'Theta hoa', latex: '\\Theta', preview: '\\Theta', tags: 'Theta hoa' },
    { name: 'Lambda hoa', latex: '\\Lambda', preview: '\\Lambda', tags: 'Lambda hoa' },
    { name: 'Xi hoa', latex: '\\Xi', preview: '\\Xi', tags: 'Xi hoa' },
    { name: 'Pi hoa', latex: '\\Pi', preview: '\\Pi', tags: 'Pi hoa' },
    { name: 'Sigma hoa', latex: '\\Sigma', preview: '\\Sigma', tags: 'Sigma hoa tong' },
    { name: 'Upsilon hoa', latex: '\\Upsilon', preview: '\\Upsilon', tags: 'Upsilon hoa' },
    { name: 'Phi hoa', latex: '\\Phi', preview: '\\Phi', tags: 'Phi hoa' },
    { name: 'Psi hoa', latex: '\\Psi', preview: '\\Psi', tags: 'Psi hoa' },
    { name: 'Omega hoa', latex: '\\Omega', preview: '\\Omega', tags: 'Omega hoa ohm' }
  ]
};

const HIGH_SCHOOL_PRESETS = [
  {
    name: 'Nghiệm PT bậc 2',
    latex: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}'
  },
  {
    name: 'Định lý Vi-ét bậc 2',
    latex: '\\begin{cases} x_1 + x_2 = -\\frac{b}{a} \\\\ x_1 x_2 = \\frac{c}{a} \\end{cases}'
  },
  {
    name: 'BĐT Cauchy (AM-GM)',
    latex: '\\frac{a + b}{2} \\ge \\sqrt{ab}'
  },
  {
    name: 'BĐT Bunhiacopxki',
    latex: '(a_1 b_1 + a_2 b_2)^2 \\le (a_1^2 + a_2^2)(b_1^2 + b_2^2)'
  },
  {
    name: 'Nhị thức Newton',
    latex: '(a + b)^n = \\sum_{k=0}^{n} C_{n}^{k} a^{n-k} b^k'
  },
  {
    name: 'Công thức Heron',
    latex: 'S = \\sqrt{p(p - a)(p - b)(p - c)}'
  },
  {
    name: 'Độ dài đoạn thẳng AB',
    latex: 'AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}'
  },
  {
    name: 'Khoảng cách điểm tới mp',
    latex: 'd(M, (P)) = \\frac{|Ax_0 + By_0 + Cz_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}'
  },
  {
    name: 'Góc giữa 2 vectơ',
    latex: '\\cos(\\vec{u}, \\vec{v}) = \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{u}| \\cdot |\\vec{v}|}'
  },
  {
    name: 'Cấp số cộng',
    latex: 'u_n = u_1 + (n - 1)d, \\quad S_n = \\frac{n(u_1 + u_n)}{2}'
  },
  {
    name: 'Cấp số nhân',
    latex: 'u_n = u_1 \\cdot q^{n-1}, \\quad S_n = \\frac{u_1(1 - q^n)}{1 - q}'
  },
  {
    name: 'Tọa độ trung điểm M',
    latex: 'M\\left(\\frac{x_A + x_B}{2}; \\frac{y_A + y_B}{2}; \\frac{z_A + z_B}{2}\\right)'
  },
  {
    name: 'Tọa độ trọng tâm G',
    latex: 'G\\left(\\frac{x_A + x_B + x_C}{3}; \\frac{y_A + y_B + y_C}{3}; \\frac{z_A + z_B + z_C}{3}\\right)'
  },
  {
    name: 'PT tiếp tuyến đồ thị',
    latex: 'y = f\'(x_0)(x - x_0) + y_0'
  },
  {
    name: 'Thể tích khối chóp',
    latex: 'V = \\frac{1}{3} S_{\\text{đáy}} \\cdot h'
  },
  {
    name: 'Thể tích lăng trụ',
    latex: 'V = S_{\\text{đáy}} \\cdot h'
  },
  {
    name: 'Thể tích khối cầu',
    latex: 'V = \\frac{4}{3}\\pi R^3'
  },
  {
    name: 'Diện tích mặt cầu',
    latex: 'S = 4\\pi R^2'
  },
  {
    name: 'Thể tích khối nón',
    latex: 'V = \\frac{1}{3}\\pi R^2 h'
  },
  {
    name: 'Thể tích khối trụ',
    latex: 'V = \\pi R^2 h'
  },
  {
    name: 'Đạo hàm tích',
    latex: '(u \\cdot v)\' = u\'v + uv\''
  },
  {
    name: 'Đạo hàm thương',
    latex: '\\left(\\frac{u}{v}\\right)\' = \\frac{u\'v - uv\'}{v^2}'
  },
  {
    name: 'Lượng giác nhân đôi Cos',
    latex: '\\cos 2x = \\cos^2 x - \\sin^2 x = 2\\cos^2 x - 1'
  },
  {
    name: 'Lượng giác nhân đôi Sin',
    latex: '\\sin 2x = 2\\sin x \\cos x'
  }
];

export const FormulaEditor: React.FC = () => {
  const styles = useStyles();
  const [activeCategory, setActiveCategory] = useState<string>('fractions');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [latexInput, setLatexInput] = useState<string>('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
  const [status, setStatus] = useState<string>('');
  const [copiedLatex, setCopiedLatex] = useState<boolean>(false);
  const [copiedMathML, setCopiedMathML] = useState<boolean>(false);

  // Active focus target: 'mathfield' (visual preview box) or 'textarea' (LaTeX code)
  const [activeFocus, setActiveFocus] = useState<'mathfield' | 'textarea'>('mathfield');

  // DOM Refs
  const mfContainerRef = useRef<HTMLDivElement>(null);
  const mathfieldRef = useRef<MathfieldElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Selection state in textarea to insert precisely at cursor
  const textareaSelectionRef = useRef<{ start: number; end: number }>({
    start: latexInput.length,
    end: latexInput.length
  });

  const isInitializedRef = useRef<boolean>(false);

  // Initialize MathLive element inside container
  useEffect(() => {
    if (!mfContainerRef.current || isInitializedRef.current) return;

    const mf = new MathfieldElement();
    mf.mathVirtualKeyboardPolicy = 'manual';
    mf.value = latexInput;
    mf.style.width = '100%';
    mf.style.minHeight = '60px';
    mf.style.fontSize = '22px';
    mf.style.fontFamily = '"Cambria Math", "KaTeX_Main", "Times New Roman", serif';
    mf.style.border = 'none';
    mf.style.outline = 'none';
    mf.style.background = 'transparent';
    mf.style.display = 'block';

    const handleInput = () => {
      const val = mf.value;
      setLatexInput(val);
      textareaSelectionRef.current = { start: val.length, end: val.length };
    };

    const handleFocus = () => {
      setActiveFocus('mathfield');
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('focus', handleFocus);

    mfContainerRef.current.innerHTML = '';
    mfContainerRef.current.appendChild(mf);
    mathfieldRef.current = mf;
    isInitializedRef.current = true;

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Sync state changes from outside into MathLive mathfield (if different)
  useEffect(() => {
    const mf = mathfieldRef.current;
    if (mf && mf.value !== latexInput) {
      mf.setValue(latexInput);
    }
  }, [latexInput]);

  // Insert snippet AT EXACT CURSOR POSITION
  const handleInsertSnippet = useCallback((snippet: string) => {
    if (activeFocus === 'textarea') {
      const ta = textareaRef.current;
      if (ta) {
        const start = ta.selectionStart ?? textareaSelectionRef.current.start;
        const end = ta.selectionEnd ?? textareaSelectionRef.current.end;
        const before = latexInput.substring(0, start);
        const after = latexInput.substring(end);
        const nextVal = before + snippet + after;

        setLatexInput(nextVal);
        if (mathfieldRef.current) {
          mathfieldRef.current.setValue(nextVal);
        }

        const newPos = start + snippet.length;
        textareaSelectionRef.current = { start: newPos, end: newPos };

        setTimeout(() => {
          ta.focus();
          ta.setSelectionRange(newPos, newPos);
        }, 10);
        return;
      }
    }

    // Default to visual mathfield: insert right at current mathfield caret/selection!
    const mf = mathfieldRef.current;
    if (mf) {
      mf.focus();
      mf.insert(snippet, {
        format: 'latex',
        focus: true,
        insertionMode: 'replaceSelection'
      });
      const updatedVal = mf.value;
      setLatexInput(updatedVal);
      textareaSelectionRef.current = { start: updatedVal.length, end: updatedVal.length };
    }
  }, [activeFocus, latexInput]);

  const handleUndo = useCallback(() => {
    if (mathfieldRef.current) {
      mathfieldRef.current.executeCommand('undo');
      setLatexInput(mathfieldRef.current.value);
    }
  }, []);

  const handleRedo = useCallback(() => {
    if (mathfieldRef.current) {
      mathfieldRef.current.executeCommand('redo');
      setLatexInput(mathfieldRef.current.value);
    }
  }, []);

  const handleClear = useCallback(() => {
    setLatexInput('');
    if (mathfieldRef.current) {
      mathfieldRef.current.value = '';
      mathfieldRef.current.focus();
    }
    textareaSelectionRef.current = { start: 0, end: 0 };
  }, []);

  const handlePresetSelect = useCallback((presetLatex: string) => {
    setLatexInput(presetLatex);
    if (mathfieldRef.current) {
      mathfieldRef.current.setValue(presetLatex);
      mathfieldRef.current.focus();
    }
    textareaSelectionRef.current = { start: presetLatex.length, end: presetLatex.length };
  }, []);

  const handleTextareaSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    textareaSelectionRef.current = {
      start: target.selectionStart,
      end: target.selectionEnd
    };
  };

  const handleInsertDisplay = async () => {
    if (!latexInput.trim()) return;
    setStatus('Đang tạo công thức chuẩn Word Equation (OMML)...');
    const res = await insertMathEquation(latexInput, false);
    setStatus(res.message);
  };

  const handleInsertInline = async () => {
    if (!latexInput.trim()) return;
    setStatus('Đang chèn công thức trong dòng...');
    const res = await insertMathEquation(latexInput, true);
    setStatus(res.message);
  };

  const handleCopyLatex = () => {
    navigator.clipboard.writeText(latexInput);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2000);
  };

  const handleCopyMathML = () => {
    try {
      const mathml = latexToMathML(latexInput);
      navigator.clipboard.writeText(mathml);
      setCopiedMathML(true);
      setTimeout(() => setCopiedMathML(false), 2000);
    } catch {
      setStatus('Lỗi sao chép MathML');
    }
  };

  // Filter templates across categories if searching
  const displayedTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return TEMPLATES_BY_CAT[activeCategory] || [];
    }

    // Search across all categories
    const results: MathTemplate[] = [];
    Object.values(TEMPLATES_BY_CAT).forEach((list) => {
      list.forEach((item) => {
        if (
          item.name.toLowerCase().includes(q) ||
          item.latex.toLowerCase().includes(q) ||
          (item.tags && item.tags.toLowerCase().includes(q))
        ) {
          results.push(item);
        }
      });
    });
    return results;
  }, [searchQuery, activeCategory]);

  return (
    <div className={styles.container}>
      <Card>
        <CardHeader
          image={<MathFormula24Regular style={{ color: '#0f6cbd' }} />}
          header={<Text weight="semibold" size={400}>Trình soạn thảo công thức Toán (MathType / Word Equation)</Text>}
          description={
            <Text size={200}>
              Bộ công cụ toàn diện hơn 250 ký hiệu & mẫu MathType: Bấm chuột đặt con trỏ bất kỳ vị trí nào để chèn
            </Text>
          }
        />

        {/* Categories Tab Navigation */}
        <div className={styles.categoryNav}>
          <TabList
            selectedValue={activeCategory}
            onTabSelect={(_: SelectTabEvent, data: SelectTabData) => {
              setActiveCategory(data.value as string);
              setSearchQuery('');
            }}
            size="small"
          >
            {CATEGORIES.map((c) => (
              <Tab key={c.id} value={c.id}>
                {c.label}
              </Tab>
            ))}
          </TabList>
        </div>

        {/* Quick Search Filter across all MathType symbols */}
        <div className={styles.searchRow}>
          <Input
            size="small"
            contentBefore={<Search20Regular />}
            placeholder="🔍 Tìm nhanh ký hiệu hoặc công thức (ví dụ: vi phân, căn, hệ pt, alpha, tích phân, ma trận, vector...)..."
            value={searchQuery}
            onChange={(_, d) => setSearchQuery(d.value)}
            style={{ width: '100%' }}
          />
          {searchQuery && (
            <Button size="small" appearance="subtle" onClick={() => setSearchQuery('')}>
              Xóa tìm
            </Button>
          )}
        </div>

        {/* Visual Formula Template Grid with Mini-KaTeX Previews */}
        <div className={styles.paletteGrid}>
          {displayedTemplates.map((tmpl, idx) => {
            let miniHtml = '';
            try {
              miniHtml = katex.renderToString(tmpl.preview, {
                displayMode: false,
                throwOnError: false
              });
            } catch {
              miniHtml = tmpl.name;
            }

            return (
              <button
                key={idx}
                type="button"
                className={styles.mathButton}
                onMouseDown={(e) => {
                  // Prevent stealing focus so caret position is preserved!
                  e.preventDefault();
                }}
                onClick={() => handleInsertSnippet(tmpl.latex)}
                title={`Chèn "${tmpl.name}" tại vị trí con trỏ`}
                dangerouslySetInnerHTML={{ __html: miniHtml }}
              />
            );
          })}
        </div>

        {/* High-School Math Presets */}
        <div>
          <Text size={200} weight="semibold" style={{ color: '#0f6cbd' }}>
            ⚡ Mẫu công thức chuẩn SGK THCS & THPT:
          </Text>
          <div className={styles.quickPresetsRow}>
            {HIGH_SCHOOL_PRESETS.map((p, idx) => (
              <Button
                key={idx}
                size="small"
                appearance="subtle"
                style={{ fontSize: '11px', height: '26px' }}
                onClick={() => handlePresetSelect(p.latex)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        </div>

        {/* INTERACTIVE MathType / Word Equation Box (EDITABLE DIRECTLY AT PREVIEW!) */}
        <Field
          label={
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Text weight="semibold" size={300} style={{ color: '#0f6cbd' }}>
                Ô soạn thảo trực quan (Chỉnh sửa tuỳ ý ngay tại đây):
              </Text>
              <Badge appearance="tint" color="brand" icon={<CursorClick20Regular />}>
                Bấm chuột vào vị trí bất kỳ để đặt dấu nháy
              </Badge>
            </div>
          }
        >
          <div className={styles.editorBoxWrapper}>
            <div className={styles.editorBoxHeader}>
              <Text size={200} style={{ color: '#555', fontStyle: 'italic' }}>
                💡 Gõ phím hoặc di chuyển con trỏ, chèn ký hiệu tại vị trí nháy chuột
              </Text>
              <div style={{ display: 'flex', gap: '4px' }}>
                <Tooltip content="Hoàn tác (Ctrl+Z)" relationship="label">
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ArrowUndo20Regular />}
                    onClick={handleUndo}
                    title="Hoàn tác"
                  />
                </Tooltip>
                <Tooltip content="Làm lại (Ctrl+Y)" relationship="label">
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<ArrowRedo20Regular />}
                    onClick={handleRedo}
                    title="Làm lại"
                  />
                </Tooltip>
                <Tooltip content="Xóa trắng công thức" relationship="label">
                  <Button
                    size="small"
                    appearance="subtle"
                    icon={<Delete20Regular />}
                    onClick={handleClear}
                    title="Xóa trắng"
                  />
                </Tooltip>
              </div>
            </div>

            {/* Mount for MathLive interactive Mathfield */}
            <div
              ref={mfContainerRef}
              className={styles.mathfieldMount}
              onClick={() => {
                mathfieldRef.current?.focus();
                setActiveFocus('mathfield');
              }}
            />
          </div>
        </Field>

        {/* Synchronized LaTeX Code Editor */}
        <Field label="Mã lệnh LaTeX (Đồng bộ thời gian thực - Có thể sửa trực tiếp hoặc chép):">
          <Textarea
            ref={textareaRef}
            value={latexInput}
            onChange={(e) => {
              setLatexInput(e.target.value);
              textareaSelectionRef.current = {
                start: e.target.selectionStart,
                end: e.target.selectionEnd
              };
            }}
            onFocus={() => setActiveFocus('textarea')}
            onSelect={handleTextareaSelect}
            onKeyUp={handleTextareaSelect}
            onClick={handleTextareaSelect}
            rows={3}
            placeholder="Mã LaTeX tự động đồng bộ theo ô soạn thảo ở trên..."
            style={{ fontFamily: 'Consolas, monospace', fontSize: '13px' }}
          />
        </Field>

        {/* Bottom Actions */}
        <div className={styles.actions} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                size="small"
                appearance="subtle"
                icon={<Delete20Regular />}
                onClick={handleClear}
              >
                Xóa hết
              </Button>
              <Button
                size="small"
                appearance="subtle"
                icon={copiedLatex ? <Checkmark20Regular style={{ color: 'green' }} /> : <Copy20Regular />}
                onClick={handleCopyLatex}
              >
                {copiedLatex ? 'Đã chép LaTeX!' : 'Chép LaTeX'}
              </Button>
              <Button
                size="small"
                appearance="subtle"
                icon={copiedMathML ? <Checkmark20Regular style={{ color: 'green' }} /> : <Copy20Regular />}
                onClick={handleCopyMathML}
                title="Sao chép MathML chuẩn (Dán trực tiếp Ctrl+V vào Word)"
              >
                {copiedMathML ? 'Đã chép MathML!' : 'Chép MathML'}
              </Button>
            </div>

            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <Button
                appearance="secondary"
                size="medium"
                icon={<Add20Regular />}
                onClick={handleInsertInline}
                title="Chèn công thức nằm trong cùng dòng văn bản (inline equation)"
              >
                Chèn trong dòng (Inline)
              </Button>
              <Button
                appearance="primary"
                size="medium"
                icon={<Add20Regular />}
                onClick={handleInsertDisplay}
                title="Chèn công thức chuẩn Microsoft Word Equation (OMML)"
              >
                Chèn Equation vào Word
              </Button>
            </div>
          </div>
        </div>

        {status && (
          <Badge appearance="tint" color="informative" style={{ marginTop: '4px' }}>
            {status}
          </Badge>
        )}
      </Card>
    </div>
  );
};
