import React, { useState, useEffect } from 'react';
import { useGym } from '../../contexts/GymContext';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  Calendar,
  DollarSign,
  BarChart3,
  UserPlus,
  Filter,
  X
} from 'lucide-react';

interface DashboardStats {
  totalSubscribers: number;
  activeSubscribers: number;
  expiringSubscribers: number;
  totalProducts: number;
  lowStockProducts: number;
  totalRevenue: number;
  subscriptionRevenue: number;
  salesRevenue: number;
  salesProfit: number;
  totalSales: number;
}

interface Category {
  id: number;
  name: string;
}

const DashboardHome: React.FC = () => {
  const { gymId, gymName, gymType } = useGym();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscribers: 0,
    activeSubscribers: 0,
    expiringSubscribers: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    totalRevenue: 0,
    subscriptionRevenue: 0,
    salesRevenue: 0,
    salesProfit: 0,
    totalSales: 0
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filterType, setFilterType] = useState<'month' | 'day' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadDashboardStats();
  }, [gymId, filterType, selectedDate, selectedMonth, selectedYear, startDate, endDate, selectedCategories]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.target || (e.target as HTMLElement).tagName !== 'INPUT') {
        e.preventDefault();
        navigate('/dashboard/sales');
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);

  const loadCategories = async () => {
    try {
      const data = await window.electronAPI.query('SELECT * FROM categories ORDER BY name');
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);

      let dateCondition = '';
      let dateParams: any[] = [];

      // Build date condition based on filter type
      if (filterType === 'day') {
        dateCondition = "AND DATE(created_at) = ?";
        dateParams = [selectedDate];
      } else if (filterType === 'month') {
        dateCondition = "AND strftime('%m', created_at) = ? AND strftime('%Y', created_at) = ?";
        dateParams = [selectedMonth.toString().padStart(2, '0'), selectedYear.toString()];
      } else if (filterType === 'range' && startDate && endDate) {
        dateCondition = "AND DATE(created_at) BETWEEN ? AND ?";
        dateParams = [startDate, endDate];
      }

      // Get subscribers stats
      const subscribersData = await window.electronAPI.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'expiring' THEN 1 ELSE 0 END) as expiring
        FROM subscribers 
        WHERE gym_id = ? ${dateCondition}
      `, [gymId, ...dateParams]);

      // Get products stats
      const productsData = await window.electronAPI.query(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN male_gym_quantity + female_gym_quantity < 5 THEN 1 ELSE 0 END) as low_stock
        FROM products
      `);

      // Get sales data with category filter
      let categoryCondition = '';
      let categoryParams: any[] = [];
      if (selectedCategories.length > 0) {
        categoryCondition = `AND p.category_id IN (${selectedCategories.map(() => '?').join(',')})`;
        categoryParams = selectedCategories;
      }

      const salesData = await window.electronAPI.query(`
        SELECT 
          COUNT(DISTINCT i.id) as total_sales,
          COALESCE(SUM(i.total), 0) as revenue
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE i.gym_id = ? ${dateCondition} ${categoryCondition}
      `, [gymId, ...dateParams, ...categoryParams]);

      // Get subscription revenue
      const subscriptionRevenue = await window.electronAPI.query(`
        SELECT COALESCE(SUM(price_paid), 0) as revenue
        FROM subscribers 
        WHERE gym_id = ? ${dateCondition}
      `, [gymId, ...dateParams]);

      // Calculate profit from invoices with category filter
      const profitData = await window.electronAPI.query(`
        SELECT 
          COALESCE(SUM(i.profit), 0) as profit
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        LEFT JOIN products p ON ii.product_id = p.id
        WHERE i.gym_id = ? ${dateCondition} ${categoryCondition}
      `, [gymId, ...dateParams, ...categoryParams]);

      // Get internal sales profit with category filter
      const internalSalesProfit = await window.electronAPI.query(`
        SELECT 
          COALESCE(SUM(ins.profit), 0) as profit
        FROM internal_sales ins
        LEFT JOIN products p ON ins.product_id = p.id
        WHERE ins.gym_id = ? ${dateCondition} ${categoryCondition}
      `, [gymId, ...dateParams, ...categoryParams]);

      const totalProfit = (profitData[0]?.profit || 0) + (internalSalesProfit[0]?.profit || 0);
      const totalRevenue = (salesData[0]?.revenue || 0) + (subscriptionRevenue[0]?.revenue || 0);

      setStats({
        totalSubscribers: subscribersData[0]?.total || 0,
        activeSubscribers: subscribersData[0]?.active || 0,
        expiringSubscribers: subscribersData[0]?.expiring || 0,
        totalProducts: productsData[0]?.total || 0,
        lowStockProducts: productsData[0]?.low_stock || 0,
        totalRevenue: totalRevenue,
        subscriptionRevenue: subscriptionRevenue[0]?.revenue || 0,
        salesRevenue: salesData[0]?.revenue || 0,
        salesProfit: totalProfit,
        totalSales: salesData[0]?.total_sales || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setFilterType('month');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedMonth(new Date().getMonth() + 1);
    setSelectedYear(new Date().getFullYear());
    setStartDate('');
    setEndDate('');
    setSelectedCategories([]);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div className="card-ar">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 arabic-text">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1 arabic-text">{subtitle}</p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 arabic-text">
            لوحة التحكم - {gymName}
          </h1>
          <p className="text-gray-600 arabic-text">
            نظرة عامة على أداء النادي الرياضي
          </p>
        </div>

        <div className="flex items-center space-x-reverse space-x-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary-ar arabic-text flex items-center"
          >
            <Filter className="w-5 h-5 ml-2" />
            الفلاتر
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="card-ar">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold arabic-text">فلاتر الإحصائيات</h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Filter Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setFilterType('day')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  filterType === 'day' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="arabic-text font-medium">يوم محدد</span>
              </button>
              <button
                onClick={() => setFilterType('month')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  filterType === 'month' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="arabic-text font-medium">شهر محدد</span>
              </button>
              <button
                onClick={() => setFilterType('range')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  filterType === 'range' 
                    ? 'border-blue-500 bg-blue-50 text-blue-700' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="arabic-text font-medium">فترة زمنية</span>
              </button>
            </div>

            {/* Date Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {filterType === 'day' && (
                <div className="form-group-ar">
                  <label className="form-label-ar arabic-text">التاريخ</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="form-input-ar"
                  />
                </div>
              )}

              {filterType === 'month' && (
                <>
                  <div className="form-group-ar">
                    <label className="form-label-ar arabic-text">الشهر</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="form-select-ar"
                    >
                      <option value={1}>يناير</option>
                      <option value={2}>فبراير</option>
                      <option value={3}>مارس</option>
                      <option value={4}>أبريل</option>
                      <option value={5}>مايو</option>
                      <option value={6}>يونيو</option>
                      <option value={7}>يوليو</option>
                      <option value={8}>أغسطس</option>
                      <option value={9}>سبتمبر</option>
                      <option value={10}>أكتوبر</option>
                      <option value={11}>نوفمبر</option>
                      <option value={12}>ديسمبر</option>
                    </select>
                  </div>
                  <div className="form-group-ar">
                    <label className="form-label-ar arabic-text">السنة</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="form-select-ar"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                    </select>
                  </div>
                </>
              )}

              {filterType === 'range' && (
                <>
                  <div className="form-group-ar">
                    <label className="form-label-ar arabic-text">من تاريخ</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="form-input-ar"
                    />
                  </div>
                  <div className="form-group-ar">
                    <label className="form-label-ar arabic-text">إلى تاريخ</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="form-input-ar"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Category Filter */}
            <div className="form-group-ar">
              <label className="form-label-ar arabic-text">فلترة الأرباح حسب الفئات</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {categories.map((category) => (
                  <label key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      className="ml-2"
                    />
                    <span className="text-sm arabic-text">{category.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="btn-secondary-ar arabic-text"
              >
                مسح الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي الإيرادات"
          value={formatCurrency(stats.totalRevenue)}
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="bg-green-500"
          subtitle="اشتراكات ومبيعات"
        />
        
        <StatCard
          title="إجمالي مبلغ الاشتراكات"
          value={formatCurrency(stats.subscriptionRevenue)}
          icon={<CreditCard className="w-6 h-6 text-white" />}
          color="bg-blue-500"
          subtitle="إيرادات الاشتراكات"
        />
        
        <StatCard
          title="إجمالي مبلغ المبيعات"
          value={formatCurrency(stats.salesRevenue)}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-purple-500"
          subtitle="إيرادات المبيعات"
        />
        
        <StatCard
          title="صافي الربح من المبيعات"
          value={formatCurrency(stats.salesProfit)}
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="bg-orange-500"
          subtitle={selectedCategories.length > 0 ? `${selectedCategories.length} فئة محددة` : "جميع الفئات"}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="إجمالي المشتركين"
          value={stats.totalSubscribers}
          icon={<Users className="w-6 h-6 text-white" />}
          color="bg-indigo-500"
          subtitle={`${stats.activeSubscribers} نشط`}
        />
        
        <StatCard
          title="المنتجات"
          value={stats.totalProducts}
          icon={<Package className="w-6 h-6 text-white" />}
          color="bg-teal-500"
          subtitle={`${stats.lowStockProducts} مخزون منخفض`}
        />
        
        <StatCard
          title="مبيعات الفترة"
          value={stats.totalSales}
          icon={<ShoppingCart className="w-6 h-6 text-white" />}
          color="bg-pink-500"
          subtitle="عملية بيع"
        />
        
        <StatCard
          title="مشتركين منتهية صلاحيتهم"
          value={stats.expiringSubscribers}
          icon={<Calendar className="w-6 h-6 text-white" />}
          color="bg-red-500"
          subtitle="قريباً"
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-ar">
          <div className="card-header-ar">
            <h3 className="text-lg font-semibold text-gray-900 arabic-text flex items-center">
              <TrendingUp className="w-5 h-5 ml-2" />
              الأداء المالي
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إجمالي الإيرادات</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إيرادات الاشتراكات</span>
              <span className="font-semibold text-blue-600">
                {formatCurrency(stats.subscriptionRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">إيرادات المبيعات</span>
              <span className="font-semibold text-purple-600">
                {formatCurrency(stats.salesRevenue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">صافي الربح من المبيعات</span>
              <span className="font-semibold text-orange-600">
                {formatCurrency(stats.salesProfit)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">هامش الربح</span>
              <span className="font-semibold text-indigo-600">
                {stats.salesRevenue > 0 
                  ? `${((stats.salesProfit / stats.salesRevenue) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>

        <div className="card-ar">
          <div className="card-header-ar">
            <h3 className="text-lg font-semibold text-gray-900 arabic-text flex items-center">
              <BarChart3 className="w-5 h-5 ml-2" />
              حالة المشتركين
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">مشتركين نشطين</span>
              <span className="status-active">
                {stats.activeSubscribers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">اشتراكات منتهية الصلاحية قريباً</span>
              <span className="status-expiring">
                {stats.expiringSubscribers}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 arabic-text">معدل التجديد</span>
              <span className="font-semibold text-indigo-600">
                {stats.totalSubscribers > 0 
                  ? `${((stats.activeSubscribers / stats.totalSubscribers) * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-ar">
        <div className="card-header-ar">
          <h3 className="text-lg font-semibold text-gray-900 arabic-text">
            إجراءات سريعة
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            onClick={() => navigate('/dashboard/subscribers')}
            className="btn-primary-ar arabic-text flex items-center justify-center"
          >
            <UserPlus className="w-5 h-5 ml-2" />
            إضافة مشترك جديد
          </button>
          <button 
            onClick={() => navigate('/dashboard/sales')}
            className="btn-secondary-ar arabic-text flex items-center justify-center"
          >
            <CreditCard className="w-5 h-5 ml-2" />
            إنشاء فاتورة مبيعات (Space)
          </button>
          <button 
            onClick={() => navigate('/dashboard/products')}
            className="btn-secondary-ar arabic-text flex items-center justify-center"
          >
            <Package className="w-5 h-5 ml-2" />
            إضافة منتج جديد
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;