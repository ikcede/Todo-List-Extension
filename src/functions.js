
/* Structure of the localStorage objects

ListList: serialization

*/

// Functions to deal with localStorage
function open(dataStr) {
	var str = localStorage[dataStr];
	if(!str || typeof(str) === "undefined") {
		return {};
	} 
	else return JSON.parse(str);
}

function save(obj, dataStr) {
	localStorage[dataStr] = JSON.stringify(obj);
}

// Shortening text 
function shorten(text, size) {
	if(typeof(size) === "undefined") size = 27; // Default cutoff
	
	return text.length > size ? text.substring(0,size) + "..." : text;
}

function removeTags(text) {
	text = text.replace(/\</g,"&lt;")   //for <
	return text.replace(/\>/g,"&gt;")   //for >
}

//-----------------------------------------------
// List Object
//-----------------------------------------------

var theList = null;

var ListItem = function(value) {
	return {
		value: value,
		checked: false,
		daysLeft: -1,
		deadline: "",
		details: ""
	};
};

var List = function(target, settings) {

	// Data fields
	var model = {
		items: [],
		undoStack: []
	};
	
	// Rendering
	var view = {
		el: target
	};
	
	settings = $.extend({
		hash: "ListList",
		sort: "alpha"
	},settings);
	
	//----------------------------------------
	// FUNCTIONS
	var functions = {
	
		// Saving and loading
		save: function() {
			var obj = {items:this.items, undoStack:this.undoStack, settings:this.settings};
			localStorage[this.settings.hash] = JSON.stringify(obj);
			
			// Chaining
			return this;
		},
		
		load: function() {
			var str = localStorage[this.settings.hash];
			if(!str || typeof(str) === "undefined") {
				this.items = [];
				this.undoStack = [];
			} 
			else {
				var obj = JSON.parse(str);
				this.items = obj.items;
				this.undoStack = obj.undoStack;
				this.settings = $.extend(settings, obj.settings);
			}
			
			// Chaining
			return this;
		},
		
		// Model manipulations
		add: function(value, index) {
			if(typeof(index) === "undefined") {
				this.items.push(ListItem(value));
			} else {
				this.items.splice(index, 0, ListItem(value));
			}
			return this;
		},
		
		// Edits the value of the item at index
		editValue: function(index, newval) {
			this.items[index].value = newval;
			return this;
		},
		
		// Delete value at index
		deleteValue: function(index) {
			this.items.splice(index,1);
			return this;
		},
		
		// Deletes all checked items
		clean: function() {
			for(var i=0;i<this.items.length;i++) {
				if(this.items[i].checked) {
					this.items.splice(i,1);
					i--;
				}
			}
			return this;
		},
		
		// Sorts the items by different algorithms
		sort: function(algo) {
			if(algo == "alpha") {
				this.items.sort(function(a,b) {
					if(a.value == b.value) return 0;
					return a.value > b.value ? 1 : -1;
				});
			} else if(algo == "checked") {
				this.items.sort(function(a,b) {
					if(a.checked == b.checked) {
						// Sort alphabetically
						if(a.value == b.value) return 0;
						return a.value > b.value ? 1 : -1;
					}
					
					// Put checked on bottom
					if(a.checked && !b.checked) {
						return 1;
					}
					return -1;
				});
			} else if(algo == "remaining") {
				this.items.sort(function(a,b) {
					if(a.daysLeft == b.daysLeft) {
						// Sort by checks
						if(a.checked && !b.checked) return 1;
						if(!a.checked && b.checked) return -1;
						
						// Sort alphabetically
						if(a.value == b.value) return 0;
						return a.value > b.value ? 1 : -1;
					}
					if(a.daysLeft <= -1) {
						return 1;
					} else if(b.daysLeft <= -1) {
						return -1;
					}
					return a.daysLeft > b.daysLeft ? 1 : -1;
				});
			}
			this.settings.sort = algo;
			return this;
		},
		
		// Calculates all the remaining days from deadline
		calcDays: function() {
			
			var _MS_PER_DAY = 1000 * 60 * 60 * 24;

			// a and b are javascript Date objects
			function dateDiffInDays(a, b) {
				// Discard the time and time-zone information.
				var utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
				var utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

				return Math.floor((utc1 - utc2) / _MS_PER_DAY);
			}
			
			for(i in this.items) {
				if(this.items[i].deadline && this.items[i].deadline != "") {
					// Difference between deadline and now
					this.items[i].daysLeft = dateDiffInDays(new Date(this.items[i].deadline), new Date());
				}
			}
			
			return this;
		},
		
		// Reorders the model based on custom sort
		reorder: function() {
			var elements = $(this.el).children(".list-item");
			var swap = null;
			for(var i=0;i<this.items.length;i++) {
				if(Number($(elements[i]).attr("data-index")) == i) {
					continue;
				} else {
					if(swap) {
						var temp = this.items[swap];
						this.items[swap] = this.items[i];
						this.items[i] = temp;
						return this;
					}
					else {
						swap = i;
					}
				}
			}
			return this;
		},
		
		// Undo previous action
		undo: function() {
			return this;
		},
	
		// Renders the list into the target in settings
		render: function() {
			this.calcDays();
			this.sort(this.settings.sort);
		
			var s = "";
			var checked = false;
			for(var i=0;i<this.items.length;i++) {
				s += "<div class='list-item' data-index='"+i+"'>";
			
				// Deal with checkmark
				checked = this.items[i].checked;
			
				s += "<div class='check-container'>";
				if(checked) {
					s += "<input type='checkbox' class='check' checked></input>";
				} else {
					s += "<input type='checkbox' class='check'></input>";
				}
			
				s += "</div><div class='item-text'>"+removeTags(shorten(this.items[i].value))+"</div>";
			
				// Deal with days left
				if(this.items[i].deadline && this.items[i].deadline != "") {
					var days = this.items[i].daysLeft;
					var color = "green";
					
					if(days < 3) {
						color = "red";
					} else if (days < 5) {
						color = "orange";
					}
					
					// Leave red for overdue
					if(days < 0) {
						days = "";
					} else {
						days += "d";
					}
					
					s += "<div class='days "+color+"'>"+days+"</div>";
					
				} else {
					s += "<div class='days green'></div>"
				}
			
				s+="</div>";
			}
		
			$(this.el).html(s);
			
			// Chaining
			return this;
		}

	};	
	
	// Generate object
	return $.extend({settings:settings}, model, view, functions);
}

//-----------------------------------------------
// Item View Object
//-----------------------------------------------

var ItemView = function(selector, itemIndex) {
	var el = $(selector);
	var item = theList.items[itemIndex];
	var functions = {
		show: function() {
			this.render();
			
			$("#list").css({"overflow-y":"hidden", "max-height":"385px"});
			el.css({"height":"385px"});
			el.animate({left:0});
		},
		
		// Sets all values and hides the detail view
		hide: function(scroll) {
		
			// Get all changed values
			item.deadline = $(el.children("#datepicker")[0]).val();
			if(item.deadline == "") {item.daysLeft = -1;}
			item.details = $(el.children(".item-notes")[0]).val();
			var itemVal = $(el.children(".item-value")[0]).val();
			if(itemVal != "") item.value = itemVal;
		
			theList.save().render();
			
			el.animate({left:350}, function() {$(this).css({"height":"5px"});});
			$("#list").css({"overflow-y":"auto", "max-height":"none"});
			$("#main").scrollTop(scroll);
		}, 
		
		// Deletes item from list and closes list detail view
		delete: function(scroll) {
			
			theList.deleteValue(itemIndex).save().render();
		
			el.animate({left:350}, function() {$(this).css({"height":"5px"});});
			$("#list").css({"overflow-y":"auto", "max-height":"none"});
			$("#main").scrollTop(scroll);
		},
		
		// Draws all elements
		render: function() {
		
			var s = "<div class='item-detail-title'>Item Details</div><hr>";
			
			s += "Value: <br><input type='text' class='item-value' placeholder='Enter value...'></input>";
			s += "<br><br>Deadline: <input type='text' id='datepicker' placeholder='None'><br><br>";
			s += "Notes:<br><textarea class='item-notes'></textarea>";
			s += "<br><br><button id='close-itemview'>Save and Return</button>";
			s += "<button id='item-delete' class='red'>Delete</button>";
			
			el.html(s);
			
			var scroll = $("#main").scrollTop(); // Save old scroll position
			
			setTimeout(function() {
				$("#datepicker").datepicker();
				$("#close-itemview").click(function() {ItemView("#itemview", itemIndex).hide(scroll);});
				$("#item-delete").click(function() {ItemView("#itemview", itemIndex).delete(scroll);});
				
				if(item.deadline) $("#datepicker").val(item.deadline); 
				if(item.value || item.value === "false") $("#itemview .item-value").val(item.value);
				if(item.details || item.details === "false") $("#itemview .item-notes").val(item.details);
			},300);
			
		}
	};
	return functions;
};

//-------------------------------------------------------
// Event Handling
//-------------------------------------------------------

$(document).on("keydown", "#cmd", function(event) {
	
	// Enter key
	if (event.which == 13 || event.keyCode == 13) {
		
		var input = $("#cmd").val();
		$("#cmd").val("");
		
		if(input == "/clean" || input == "/cln") {
			theList.clean().save().render();
		}
		
		else if(input == "/sort alpha" || input == "/sa") {
			theList.sort("alpha").save().render();
		}
		
		else if(input == "/sort remaining" || input == "/sr") {
			theList.sort("remaining").save().render();
		}
		
		// Fix thisss
		else if(input == "/sort checked" || input == "/sc") {
			theList.sort("checked").save().render();
		}
		
		else if(input != "") {
			theList.add(input).save().render();
		} 
		
		return false;
	}
	return true;
});

// Saving the checkmark of items
$(document).on("change", ".check", function() {
	
	var index = Number($(this).parent().parent().attr("data-index"));
	theList.items[index].checked = this.checked;
	theList.save();
	
	setTimeout(function() {$("#control #cmd").focus();}, 50);
	
});

// Editing text
$(document).on("dblclick", ".item-text", function(e) {
	var item = theList.items[$(this).parent().attr("data-index")];
	var el = this;
	
	$(this).html("<input type='text' class='item-name-input'></input>");
	var input = $(this).children(".item-name-input")[0];
	$(input).val(item.value);
	
	$(input).focus().on("keydown", function(event) {
		if (event.which == 13 || event.keyCode == 13) {
			
			// Set new value, render, and save
			var value = $(input).val();
			
			if(value == "") {
				theList.deleteValue($(el).parent().attr("data-index")).save().render();
			}
			item.value = value;
			
			$(el).html(removeTags(shorten(value)));
			
			theList.save();
			setTimeout(function() {$("#control #cmd").focus();}, 50);
			return false;
		}
		return true;
		
	}).on("blur", function() {
		// Reset if not entered		
		$(el).html(removeTags(shorten(item.value)));
	});

	return false;
});

// Opens up an item's details
$(document).on("dblclick", ".list-item .days", function() {
	ItemView("#itemview", Number($(this).parent().attr("data-index"))).show();
});

//-------------------------------------------------------
// Running
//-------------------------------------------------------

// Ready function
$(document).ready(function() {
	theList = List($("#list")[0]);
	theList.load().render();
	
	setTimeout(function() {$("#control #cmd").focus();}, 100);
	
	$("#list").sortable({
		delay: 500,
		stop: function() {
			theList.settings.sort = "custom";
			theList.reorder().save();
		}
	});
	
	$("#itemview").disableSelection();
	
});