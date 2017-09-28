'use strict'

var dtXHR;
function dtMakeRequest(method, url, sendData, done){
	dtXHR = new XMLHttpRequest();
	dtXHR.open(method, url);

	dtXHR.onreadystatechange = function(){
		if ( dtXHR.readyState === XMLHttpRequest.DONE ){
			var retData = JSON.parse(dtXHR.responseText);
			if ( dtXHR.status >= 200 && dtXHR.status < 400 ){
				done(null, retData);
			} else {
				done(retData);
			}
		} else {

		}
	}
	dtXHR.send(sendData);
}

function shallowCopy(){
	var name, options, copy;
	var length = arguments.length;
	var i = 1;
	var target = arguments[0];

	for ( ; i < length; i++ ){
		options = arguments[i];
		if ( options != null ){
			for ( name in options ){
				copy = options[name];
				if ( copy !== undefined ){
					target[name] = copy;
				}
			}
		}
	}
	return target;
}

function DataTable(custom_options){
	if ( custom_options === undefined ){
		custom_options = {};
	}

	this.default = {
		table_id: 'dataTable',
		pagination_id: 'pagination',
		item_per_page_id: 'itemPerPage',
		search_id: 'searchInput',
		display_columns_id: 'displayColumnsWrap',
		display_columns_checkbox_name: 'displayColumns[]',
		request_url: 'data/data.json',
		item_per_page: 10
	};

	this.options = {};

	this.options = shallowCopy(this.default, custom_options);

	this.request_url = this.options.request_url;
	this.origin_data = {};
	this.current_data = {};
	this.origin_columns = {};
	this.origin_columns_length = 0;
	this.current_columns = {};
	this.current_sort_column = {};
	this.item_per_page = this.options.item_per_page;
	this.current_page_data = {};
	this.total_pages = 0;
	this.current_page = 1;
	this.table = document.getElementById(this.options.table_id);
	this.pagination = document.getElementById(this.options.pagination_id);
	this.item_per_page_el = document.getElementById(this.options.item_per_page_id);
	this.search_input_el = document.getElementById(this.options.search_id);
	this.display_columns_el = document.getElementById(this.options.display_columns_id);
	this.display_columns_checkbox_name = this.options.display_columns_checkbox_name
	this.default_text = {
		no_records : "No matching records found"
	};
}

DataTable.prototype = {
	constructor : DataTable,

	init : function(){
		var that = this;

		dtMakeRequest( 'GET', this.request_url, {}, function( err, ret ){
			if ( err ) throw err;

			that.current_data = that.origin_data = ret.data;
			that.origin_columns = ret.columns;
			that.assignVariable();
			that.setupEventListener();
			that.goToPage(1);
		});
	},

	assignVariable : function(){
		this.origin_columns_length = Object.keys(this.origin_columns).length;
		this.current_columns = this.origin_columns;
		this.setTotalPages();
		this.setItemPerPageSelected();
		this.sortByColumn();
	},

	setupEventListener : function(){
		var that = this;

		// Item Per Page Selector
		var itemPerPageEl = that.item_per_page_el;
		itemPerPageEl.addEventListener('change', function(){
			that.item_per_page = parseInt(itemPerPageEl.options[itemPerPageEl.selectedIndex].value);
			that.goToPage(1);
		});

		// Search Input
		var searchInputEl = that.search_input_el;
		searchInputEl.addEventListener('keyup', function(event){
			var lastTimeStamp = event.timeStamp;

			setTimeout(function(){
				if ( lastTimeStamp - event.timeStamp == 0 ){
					that.setSearching(event.target.value);
				}
			}, 1000)
		});
	},

	setupSortColumnEventListener : function(){
		var that = this,
			eles;

		eles = document.getElementsByClassName('sort-column');

		for( var i = 0; i < eles.length; i++ ){
			eles[i].addEventListener('click', function(){ that.clickColumn(event); } );
		}
	},

	setupDisplayColumnsEventListener : function(){
		var that = this,
			els = document.getElementsByName(this.display_columns_checkbox_name);

		for ( var i = 0; i < els.length; i++ ){
			els[i].addEventListener( 'change', function(){ that.changeDisplayColumns() } );
		}
	},

	changeDisplayColumns : function(){
		var els = document.getElementsByName(this.display_columns_checkbox_name);

		this.current_columns = {};
		for ( var i = 0; i < els.length; i++ ){
			if( els[i].checked ){
				this.current_columns[els[i].value] = this.origin_columns[els[i].value];
			}
		}
		this.goToPage(this.current_page);
	},

	getTotalPages : function(){
		return Math.ceil( this.current_data.length / this.item_per_page );
	},

	setTotalPages: function(){
		this.total_pages = this.getTotalPages();
	},

	setItemPerPageSelected: function(){
		var el = this.item_per_page_el;
		for( var i = 0; i < el.options.length; i++ ){
			if ( el.options[i].value == this.item_per_page ){
				el.options[i].selected = 'selected';
			}
		}
	},

	getCurrentPageData : function(){
		var begin,
			end;

		begin 	= parseInt( (this.current_page - 1) * this.item_per_page );
		end 	= begin + parseInt( this.item_per_page );

		this.current_page_data = this.current_data.slice( begin, end );
	},

	renderTable : function(){
		this.renderTbody();
		this.renderTheadTfoot();
	},

	/* Render Table */
	renderTbody : function(){
		var tbody;

		if ( this.table.querySelector('tbody') !== null ){
			tbody = this.table.querySelector('tbody');
		} else {
			tbody = document.createElement('tbody');
		}

		tbody.innerHTML = this.getTbodyHTML();
		this.table.appendChild(tbody);
	},

	getTbodyHTML : function(){
		var html = '';

		this.getCurrentPageData();

		if ( ! this.current_page_data || this.current_page_data.length === 0 ){
			html = '<tr><td colspan="' + this.origin_columns_length + '">'+ this.default_text.no_records +'</td></tr>';
			return html;
		}

		for ( var row in this.current_page_data ){
			html += '<tr>';

			for ( var col in this.current_columns ){
				html += '<td>' + this.current_page_data[row][col] + '</td>';
			}

			html += '</tr>';
		}
		return html;
	},

	renderTheadTfoot : function(){
		var thead, tfoot;

		if ( this.table.querySelector('thead') !== null ){
			thead = this.table.querySelector('thead');
			tfoot = this.table.querySelector('tfoot');
		} else {
			thead = document.createElement('thead');
			tfoot = document.createElement('tfoot');
		}

		thead.innerHTML = tfoot.innerHTML = this.getTheadTfootHTML();

		this.table.appendChild(thead);
		this.table.appendChild(tfoot);

		this.setupSortColumnEventListener();
	},

	getTheadTfootHTML : function(){
		var html = '',
			sort_classname = '';

		html += '<tr>';

		for ( var col in this.current_columns ){
			sort_classname = this.current_sort_column[col] ? 'sort-dir-' + this.current_sort_column[col] : '';
			html += '<th class="sort-column '+ sort_classname +'" data-column="' + col + '">' + this.current_columns[col] + '</th>'
		}

		html += '</tr>';

		return html;
	},

	renderPagination : function(){
		var that = this;
		that.pagination.innerHTML = '';

		// Add Pagination & Add Event Listener
		for ( var page=1; page <= that.total_pages; page++ ){
			(function(page){
				var li = document.createElement('li');
				li.setAttribute('page', page);
				li.innerHTML = '<a>' + page + '</a>';

				li.addEventListener('click', function(){
					that.goToPage(page)
				});

				that.pagination.appendChild(li);
			})(page)
		}
	},

	renderDisplayColumnsFilter : function(){
		var html = '',
			checked = '',
			el = this.display_columns_el;

		for ( var col in this.origin_columns ){
			html += '<label class="checkbox-inline">';
			html += 	this.current_columns[col] ? '<input type="checkbox" name="'+this.display_columns_checkbox_name+'" value="'+col+'" checked>' : '<input type="checkbox" name="'+this.display_columns_checkbox_name+'" value="'+col+'">';
			html += 	' ' + this.origin_columns[col];
			html += '</label>';
		}

		el.innerHTML = html;

		this.setupDisplayColumnsEventListener();
	},

	setCurrentPagination : function(page){
		var list = this.pagination.querySelectorAll('li');

		if ( list !== null && list.length > 0 ){
			list.forEach(
				function(value, key, listObj){
					if ( value.getAttribute('page') == page ){
						value.className = "active";
					} else {
						value.className = "";
					}
				}
			);
		}
	},

	goToPage : function(page){
		if ( page < 1 || isNaN(page) ){
			return;
		}
		this.current_page = parseInt(page);
		this.setTotalPages();
		this.renderTable();
		this.renderPagination();
		this.setCurrentPagination(page);
		this.renderDisplayColumnsFilter();
	},

	setSearching : function(value){
		var search_text = value.trim().toUpperCase();

		if ( !value || value == null || typeof value == undefined ){
			this.current_data = this.origin_data;
		} else {
			this.current_data = this.origin_data.filter(function(element){
				for ( var i in element ){
					if ( element[i].toUpperCase().indexOf(search_text) >= 0 ){
						return true;
					}
				}
				return false;
			});
		}

		this.current_sort_column = {};
		this.goToPage(1);
	},

	clickColumn : function(event){
		var column = event.target.getAttribute('data-column');
		if ( this.current_sort_column[column] !== 'desc' ){
			this.current_sort_column = {};
			this.current_sort_column[column] = "desc";
		} else if ( column ) {
			this.current_sort_column = {};
			this.current_sort_column[column] = "asc";
		}

		if ( column ){
			this.renderTheadTfoot();
			this.sortByColumn(column);
		}
	},

	sortByColumn : function(column){
		if ( this.isEmptyObj( this.current_sort_column ) ) return;
		
		this.current_data.sort(function(a,b){
			var value_a = a[column].toLowerCase(),
				value_b = b[column].toLowerCase();

			if ( value_a < value_b ){
				return -1;
			}
			if ( value_a > value_b ){
				return 1;
			}
			return 0;
		});

		if ( this.current_sort_column[column] === 'desc' )
			this.current_data.reverse();

		this.goToPage(this.current_page);
	},

	isEmptyObj : function(obj){
		for (var key in obj){
			if ( obj.hasOwnProperty(key) ){
				return false;
			}
		}
		return true;
	}
}