import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  id: {
    translation: {
      // Auth
      login: 'Masuk',
      register: 'Daftar',
      logout: 'Keluar',
      email: 'Email',
      password: 'Kata Sandi',
      name: 'Nama',
      // Navigation
      dashboard: 'Dashboard',
      tenants: 'Penyewa',
      invoices: 'Tagihan',
      settings: 'Pengaturan',
      // Dashboard
      totalTenants: 'Total Penyewa',
      totalInvoices: 'Total Tagihan',
      pendingInvoices: 'Tagihan Pending',
      overdueInvoices: 'Tagihan Lewat Jatuh Tempo',
      totalUncollected: 'Total Belum Terbayar',
      recentInvoices: 'Tagihan Terbaru',
      // Tenants
      addTenant: 'Tambah Penyewa',
      roomNumber: 'Nomor Kamar',
      contact: 'Kontak',
      rentAmount: 'Harga Sewa',
      waterPrice: 'Harga Air/Bulan',
      electricityRate: 'Tarif Listrik/kWh',
      occupants: 'Jumlah Penghuni',
      status: 'Status',
      active: 'Aktif',
      inactive: 'Tidak Aktif',
      // Invoices
      createInvoice: 'Buat Tagihan',
      serialNumber: 'Nomor Seri',
      tenant: 'Penyewa',
      month: 'Bulan',
      year: 'Tahun',
      rent: 'Sewa',
      electricity: 'Listrik',
      water: 'Air',
      deposit: 'Deposit',
      total: 'Total',
      paid: 'Lunas',
      pending: 'Pending',
      overdue: 'Lewat Jatuh Tempo',
      markAsPaid: 'Tandai Lunas',
      downloadPDF: 'Unduh PDF',
      electricityStart: 'Meteran Awal',
      electricityEnd: 'Meteran Akhir',
      notes: 'Catatan',
      // Common
      save: 'Simpan',
      cancel: 'Batal',
      edit: 'Edit',
      delete: 'Hapus',
      search: 'Cari',
      filter: 'Filter',
      actions: 'Aksi',
      currency: 'Mata Uang',
      language: 'Bahasa',
      // Settings
      defaultCurrency: 'Mata Uang Default',
      defaultLanguage: 'Bahasa Default'
    }
  },
  en: {
    translation: {
      // Auth
      login: 'Login',
      register: 'Register',
      logout: 'Logout',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      // Navigation
      dashboard: 'Dashboard',
      tenants: 'Tenants',
      invoices: 'Invoices',
      settings: 'Settings',
      // Dashboard
      totalTenants: 'Total Tenants',
      totalInvoices: 'Total Invoices',
      pendingInvoices: 'Pending Invoices',
      overdueInvoices: 'Overdue Invoices',
      totalUncollected: 'Total Uncollected',
      recentInvoices: 'Recent Invoices',
      // Tenants
      addTenant: 'Add Tenant',
      roomNumber: 'Room Number',
      contact: 'Contact',
      rentAmount: 'Rent Amount',
      waterPrice: 'Water Price/Month',
      electricityRate: 'Electricity Rate/kWh',
      occupants: 'Occupants',
      status: 'Status',
      active: 'Active',
      inactive: 'Inactive',
      // Invoices
      createInvoice: 'Create Invoice',
      serialNumber: 'Serial Number',
      tenant: 'Tenant',
      month: 'Month',
      year: 'Year',
      rent: 'Rent',
      electricity: 'Electricity',
      water: 'Water',
      deposit: 'Deposit',
      total: 'Total',
      paid: 'Paid',
      pending: 'Pending',
      overdue: 'Overdue',
      markAsPaid: 'Mark as Paid',
      downloadPDF: 'Download PDF',
      electricityStart: 'Start Reading',
      electricityEnd: 'End Reading',
      notes: 'Notes',
      // Common
      save: 'Save',
      cancel: 'Cancel',
      edit: 'Edit',
      delete: 'Delete',
      search: 'Search',
      filter: 'Filter',
      actions: 'Actions',
      currency: 'Currency',
      language: 'Language',
      // Settings
      defaultCurrency: 'Default Currency',
      defaultLanguage: 'Default Language'
    }
  },
  zh: {
    translation: {
      // Auth
      login: '登录',
      register: '注册',
      logout: '退出',
      email: '邮箱',
      password: '密码',
      name: '姓名',
      // Navigation
      dashboard: '仪表板',
      tenants: '租户',
      invoices: '发票',
      settings: '设置',
      // Dashboard
      totalTenants: '总租户数',
      totalInvoices: '总发票数',
      pendingInvoices: '待处理发票',
      overdueInvoices: '逾期发票',
      totalUncollected: '未收取总额',
      recentInvoices: '最近发票',
      // Tenants
      addTenant: '添加租户',
      roomNumber: '房间号',
      contact: '联系方式',
      rentAmount: '租金',
      waterPrice: '水费/月',
      electricityRate: '电费/千瓦时',
      occupants: '居住人数',
      status: '状态',
      active: '活跃',
      inactive: '未活跃',
      // Invoices
      createInvoice: '创建发票',
      serialNumber: '序列号',
      tenant: '租户',
      month: '月份',
      year: '年份',
      rent: '租金',
      electricity: '电费',
      water: '水费',
      deposit: '押金',
      total: '总计',
      paid: '已付',
      pending: '待付',
      overdue: '逾期',
      markAsPaid: '标记为已付',
      downloadPDF: '下载PDF',
      electricityStart: '起始读数',
      electricityEnd: '结束读数',
      notes: '备注',
      // Common
      save: '保存',
      cancel: '取消',
      edit: '编辑',
      delete: '删除',
      search: '搜索',
      filter: '筛选',
      actions: '操作',
      currency: '货币',
      language: '语言',
      // Settings
      defaultCurrency: '默认货币',
      defaultLanguage: '默认语言'
    }
  },
  km: {
    translation: {
      // Auth
      login: 'ចូល',
      register: 'ចុះឈ្មោះ',
      logout: 'ចាកចេញ',
      email: 'អ៊ីមែល',
      password: 'ពាក្យសម្ងាត់',
      name: 'ឈ្មោះ',
      // Navigation
      dashboard: 'ផ្ទាំងគ្រប់គ្រង',
      tenants: 'អ្នកជួល',
      invoices: 'វិក្កយបត្រ',
      settings: 'ការកំណត់',
      // Dashboard
      totalTenants: 'អ្នកជួលសរុប',
      totalInvoices: 'វិក្កយបត្រសរុប',
      pendingInvoices: 'វិក្កយបត្ររង់ចាំ',
      overdueInvoices: 'វិក្កយបត្រហួសកំណត់',
      totalUncollected: 'សរុបមិនទាន់ប្រមូល',
      recentInvoices: 'វិក្កយបត្រថ្មីៗ',
      // Tenants
      addTenant: 'បន្ថែមអ្នកជួល',
      roomNumber: 'លេខបន្ទប់',
      contact: 'ទំនាក់ទំនង',
      rentAmount: 'ថ្លៃជួល',
      waterPrice: 'តម្លៃទឹក/ខែ',
      electricityRate: 'អត្រាអគ្គិសនី/kWh',
      occupants: 'អ្នករស់នៅ',
      status: 'ស្ថានភាព',
      active: 'សកម្ម',
      inactive: 'អសកម្ម',
      // Invoices
      createInvoice: 'បង្កើតវិក្កយបត្រ',
      serialNumber: 'លេខសម្គាល់',
      tenant: 'អ្នកជួល',
      month: 'ខែ',
      year: 'ឆ្នាំ',
      rent: 'ថ្លៃជួល',
      electricity: 'អគ្គិសនី',
      water: 'ទឹក',
      deposit: 'ប្រាក់កក់',
      total: 'សរុប',
      paid: 'បានបង់',
      pending: 'រង់ចាំ',
      overdue: 'ហួសកំណត់',
      markAsPaid: 'សម្គាល់ជាបានបង់',
      downloadPDF: 'ទាញយក PDF',
      electricityStart: 'ការអានចាប់ផ្តើម',
      electricityEnd: 'ការអានបញ្ចប់',
      notes: 'កំណត់ចំណាំ',
      // Common
      save: 'រក្សាទុក',
      cancel: 'បោះបង់',
      edit: 'កែសម្រួល',
      delete: 'លុប',
      search: 'ស្វែងរក',
      filter: 'ត្រង',
      actions: 'សកម្មភាព',
      currency: 'រូបិយប័ណ្ណ',
      language: 'ភាសា',
      // Settings
      defaultCurrency: 'រូបិយប័ណ្ណលំនាំដើម',
      defaultLanguage: 'ភាសាលំនាំដើម'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('appLanguage') || 'id',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
